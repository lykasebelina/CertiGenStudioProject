// src/components/KonvaCanvas.tsx

import { useEffect, useRef, useState, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Line } from "react-konva";
import Konva from "konva";
import { CertificateElement } from "../types/certificate";

interface KonvaCanvasProps {
  width: number;
  height: number;
  elements: CertificateElement[];
  onElementSelect?: (id: string | null) => void;
  // Real-time updates (fast, no history)
  onElementUpdate?: (id: string, updates: Partial<CertificateElement>) => void;
  // Final updates (save to history)
  onElementFinalUpdate?: (id: string, updates: Partial<CertificateElement>) => void;
  onImagesLoaded?: () => void;
  isEditable?: boolean; 
  
  // NEW props for click-to-place text
  isAddingText?: boolean;
  onPlaceAt?: (pos: { x: number; y: number }) => void;
  onCancelAddMode?: () => void;
}

interface ImageElement {
  id: string;
  image: HTMLImageElement;
  element: CertificateElement;
}

interface SnapGuide {
  points: number[];
  orientation: 'vertical' | 'horizontal';
}

export default function KonvaCanvas({
  width,
  height,
  elements,
  onElementSelect,
  onElementUpdate,
  onElementFinalUpdate,
  onImagesLoaded,
  isEditable = true,
  isAddingText = false,
  onPlaceAt,
  onCancelAddMode,
}: KonvaCanvasProps) {
  const [images, setImages] = useState<ImageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  // Text Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textEditValue, setTextEditValue] = useState("");
  const [textEditStyle, setTextEditStyle] = useState<React.CSSProperties>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stageRef = useRef<Konva.Stage>(null);
  
  // We don't use a single transformerRef anymore for rendering, 
  // but we keep track of nodes via itemsRef to attach individual transformers.
  const itemsRef = useRef<Record<string, Konva.Node>>({});

  // --- IMAGE LOADING LOGIC ---
  useEffect(() => {
    const loadImages = async () => {
      const imageElements = elements.filter(
        (el) =>
          (el.type === "image" || el.type === "background" || el.type === "cornerFrame") &&
          el.imageUrl
      );
      
      const loadedImages: ImageElement[] = [];
      
      for (const element of imageElements) {
        try {
          const img = new window.Image();
          const src = element.imageUrl!;

          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); 
            img.src = src;
          });
          
          if (img.width > 0) {
            loadedImages.push({ id: element.id, image: img, element });
          }
        } catch (err) {
          console.error(`Error loading image ${element.id}:`, err);
        }
      }
      setImages(loadedImages);
      onImagesLoaded?.();
    };
    loadImages();
  }, [elements, onImagesLoaded]);


  // ⭐️ LOGIC: DETERMINE WHICH IDs SHOULD HAVE A SELECTION BOX
  const activeSelectionIds = useMemo(() => {
    if (!selectedId || editingId) return [];

    const activeEl = elements.find(el => el.id === selectedId);
    
    // If a Corner Frame (Layer 4) is selected, return ALL Layer 4 IDs
    // This allows the AI generator to know we are targeting the group,
    // but allows us to map separate transformers below.
    if (activeEl && activeEl.zIndex === 4) {
        return elements
            .filter(el => el.zIndex === 4)
            .map(el => el.id);
    }

    // Otherwise, just return the single selected ID
    return [selectedId];
  }, [selectedId, editingId, elements]);


  // Cursor for add mode
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    if (isAddingText) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "default";
    }
  }, [isAddingText]);

  // --- SELECTION LOGIC ---
  const handleSelect = (id: string) => {
    if (!isEditable) return;
    if (isAddingText) return;
    setSelectedId(id);
    onElementSelect?.(id);
  };

  const handleDeselect = () => {
    setSelectedId(null);
    setEditingId(null);
    onElementSelect?.(null);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!isEditable) return;
    const stage = stageRef.current;
    if (!stage) return;

    if (isAddingText) {
      const pointer = stage.getPointerPosition();
      if (pointer && onPlaceAt) {
        onPlaceAt({ x: pointer.x, y: pointer.y });
      }
      return; 
    }

    if (e.target === stage) {
      handleDeselect();
    }
  };

  // --- SNAP LOGIC ---
  const SNAP_THRESHOLD = 30;
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isEditable) return;
    const node = e.target;
    const stage = node.getStage();
    if (!stage) return;

    const nodeWidth = node.width() * node.scaleX();
    const nodeHeight = node.height() * node.scaleY();
    
    const boxX = node.x() - node.offsetX() * node.scaleX();
    const boxY = node.y() - node.offsetY() * node.scaleY();
    
    const nodeCenterX = boxX + nodeWidth / 2;
    const nodeCenterY = boxY + nodeHeight / 2;

    const stageCenterX = stage.width() / 2;
    const stageCenterY = stage.height() / 2;

    const newGuides: SnapGuide[] = [];
    let newX = node.x();
    let newY = node.y();

    if (Math.abs(nodeCenterX - stageCenterX) < SNAP_THRESHOLD) {
      const shiftX = stageCenterX - nodeCenterX;
      newX = node.x() + shiftX;
      newGuides.push({ orientation: 'vertical', points: [stageCenterX, 0, stageCenterX, stage.height()] });
    }
    if (Math.abs(nodeCenterY - stageCenterY) < SNAP_THRESHOLD) {
      const shiftY = stageCenterY - nodeCenterY;
      newY = node.y() + shiftY;
      newGuides.push({ orientation: 'horizontal', points: [0, stageCenterY, stage.width(), stageCenterY] });
    }

    node.position({ x: newX, y: newY });
    setGuides(newGuides);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, elementId: string) => {
    if (!isEditable) return;
    setGuides([]); 
    const updates = { x: e.target.x(), y: e.target.y() };
    if (onElementFinalUpdate) onElementFinalUpdate(elementId, updates);
    else onElementUpdate?.(elementId, updates);
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, elementId: string) => {
    if (!isEditable) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const updates = {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    };

    if (onElementFinalUpdate) onElementFinalUpdate(elementId, updates);
    else onElementUpdate?.(elementId, updates);
  };

  // --- TEXT EDITING HANDLERS ---
  const handleTextDblClick = (el: CertificateElement, textNode: Konva.Text) => {
    if (!isEditable) return;
    const stage = stageRef.current;
    if (!stage) return;

    setSelectedId(null);
    onElementSelect?.(null);

    const absPos = textNode.getAbsolutePosition();
    const currentTransform = el.textTransform as string;
    let cssTransform: "none" | "uppercase" | "lowercase" | "capitalize" = "none";
    if (currentTransform === "upper" || currentTransform === "uppercase") cssTransform = "uppercase";
    else if (currentTransform === "lower" || currentTransform === "lowercase") cssTransform = "lowercase";
    else if (currentTransform === "title" || currentTransform === "capitalize") cssTransform = "capitalize";

    setEditingId(el.id);
    setTextEditValue(el.content || "");

    setTextEditStyle({
      position: "absolute",
      top: `${absPos.y}px`,
      left: `${absPos.x}px`,
      width: `${textNode.width() * stage.scaleX()}px`,
      height: `${textNode.height() * stage.scaleY()}px`,
      fontSize: `${(el.fontSize ?? 16) * stage.scaleX()}px`,
      fontFamily: el.fontFamily ?? "Arial",
      fontWeight: el.fontWeight || "normal",
      fontStyle: el.fontStyle || "normal",
      textDecoration: el.textDecoration || "none",
      color: el.color ?? "#000000",
      textAlign: (el.textAlign as any) ?? "left",
      lineHeight: `${(el.lineHeight ?? 1.2) * (el.fontSize ?? 16) * stage.scaleX()}px`,
      textTransform: cssTransform,
      background: "none",
      border: "1px dashed #0099ff", 
      padding: 0, margin: 0, resize: "none", outline: "none", overflow: "hidden", zIndex: 1000,
    });
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 50);
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextEditValue(e.target.value);
    onElementUpdate?.(editingId!, { content: e.target.value });
  };

  const handleTextEditComplete = () => {
    if (editingId) {
      onElementFinalUpdate?.(editingId, { content: textEditValue });
      setEditingId(null);
    }
  };

  const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div className="shadow-lg border border-slate-300 relative">
      {editingId && (
        <textarea
          ref={textareaRef}
          value={textEditValue}
          onChange={handleTextAreaChange}
          onBlur={handleTextEditComplete}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextEditComplete(); }
            if (e.key === "Escape") { handleTextEditComplete(); }
          }}
          style={textEditStyle}
        />
      )}
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        style={{ backgroundColor: "#ffffff" }}
      >
        <Layer>
          {sortedElements.map((el) => {
            const isSelected = selectedId === el.id;

            // IMAGE / BACKGROUND
            if (["image", "background"].includes(el.type)) {
              const imgObj = images.find((i) => i.id === el.id);
              if (imgObj) {
                const scaleX = el.width ? el.width / imgObj.image.width : 1;
                const scaleY = el.height ? el.height / imgObj.image.height : 1;
                return (
                  <KonvaImage
                    key={el.id}
                    image={imgObj.image}
                    x={el.x} y={el.y}
                    scaleX={scaleX} scaleY={scaleY}
                    rotation={el.rotate ?? 0}
                    opacity={el.opacity ?? 1}
                    draggable={isEditable}
                    perfectDrawEnabled={false}
                    onClick={() => handleSelect(el.id)}
                    onTap={() => handleSelect(el.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                    ref={(node) => { 
                      if (node) itemsRef.current[el.id] = node; 
                    }}
                  />
                );
              }
              // If no image, but background -> SOLID COLOR FALLBACK
              if (el.type === "background") {
                 return (
                    <Rect
                      key={el.id}
                      x={el.x} y={el.y}
                      width={el.width} height={el.height}
                      fill={el.backgroundColor ?? "#ffffff"}
                      opacity={el.opacity ?? 1}
                      draggable={isEditable}
                      onClick={() => handleSelect(el.id)}
                      onTap={() => handleSelect(el.id)}
                      ref={(node) => { 
                        if (node) itemsRef.current[el.id] = node; 
                      }}
                    />
                 );
              }
              return null;
            }

            // CORNER FRAME
            if (el.type === "cornerFrame") {
              const elWidth = el.width ?? 50;
              const elHeight = el.height ?? 50;
              const offsetX = elWidth / 2;
              const offsetY = elHeight / 2;
              const renderX = el.x + offsetX;
              const renderY = el.y + offsetY;
              const imgObj = images.find((i) => i.id === el.id);

              if (el.imageUrl && imgObj) {
                return (
                  <KonvaImage
                    key={el.id}
                    image={imgObj.image}
                    x={renderX} y={renderY}
                    offsetX={offsetX} offsetY={offsetY}
                    width={elWidth} height={elHeight} 
                    rotation={el.rotate ?? 0}
                    draggable={isEditable}
                    perfectDrawEnabled={false}
                    onClick={() => handleSelect(el.id)}
                    onTap={() => handleSelect(el.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={(e) => {
                      setGuides([]); 
                      const updates = { x: e.target.x() - offsetX, y: e.target.y() - offsetY };
                      if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                      else onElementUpdate?.(el.id, updates);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const sX = node.scaleX(); const sY = node.scaleY();
                      node.scaleX(1); node.scaleY(1);
                      const newW = Math.max(5, node.width() * sX);
                      const newH = Math.max(5, node.height() * sY);
                      const newOffX = newW / 2; const newOffY = newH / 2;
                      const updates = { x: node.x() - newOffX, y: node.y() - newOffY, width: newW, height: newH, rotation: node.rotation() };
                      if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                      else onElementUpdate?.(el.id, updates);
                    }}
                    ref={(node) => { 
                      if (node) itemsRef.current[el.id] = node; 
                    }}
                  />
                );
              } else {
                return (
                  <Rect
                    key={el.id}
                    x={renderX} y={renderY}
                    offsetX={offsetX} offsetY={offsetY}
                    width={elWidth} height={elHeight}
                    fill={el.backgroundColor ?? "transparent"}
                    stroke={el.borderColor ?? "transparent"} 
                    strokeWidth={el.borderWidth ?? 0}
                    dash={el.borderStyle === "dashed" ? [10, 5] : el.borderStyle === "dotted" ? [2, 4] : []}
                    rotation={el.rotate ?? 0}
                    draggable={isEditable}
                    onClick={() => handleSelect(el.id)}
                    onTap={() => handleSelect(el.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={(e) => {
                        setGuides([]); 
                        const updates = { x: e.target.x() - offsetX, y: e.target.y() - offsetY };
                        if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                        else onElementUpdate?.(el.id, updates);
                    }}
                    onTransformEnd={(e) => {
                       const node = e.target;
                      const sX = node.scaleX(); const sY = node.scaleY();
                      node.scaleX(1); node.scaleY(1);
                      const newW = Math.max(5, node.width() * sX);
                      const newH = Math.max(5, node.height() * sY);
                      const newOffX = newW / 2; const newOffY = newH / 2;
                      const updates = { x: node.x() - newOffX, y: node.y() - newOffY, width: newW, height: newH, rotation: node.rotation() };
                      if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                      else onElementUpdate?.(el.id, updates);
                    }}
                    ref={(node) => { 
                      if (node) itemsRef.current[el.id] = node; 
                    }}
                  />
                );
              }
            }

            // BORDER / INNER FRAME
            if (["border", "innerFrame"].includes(el.type)) {
              const defaultStroke = el.type === "innerFrame" ? "transparent" : "#000000";
              return (
                <Rect
                  key={el.id}
                  x={el.x} y={el.y}
                  width={el.width ?? 100} height={el.height ?? 100}
                  fill={el.backgroundColor ?? "transparent"}
                  stroke={el.borderColor ?? defaultStroke}
                  strokeWidth={el.borderWidth ?? 2}
                  dash={el.borderStyle === "dashed" ? [10, 5] : el.borderStyle === "dotted" ? [2, 4] : []}
                  draggable={isEditable}
                  onClick={() => handleSelect(el.id)}
                  onTap={() => handleSelect(el.id)}
                  onDragMove={handleDragMove}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  ref={(node) => { 
                    if (node) itemsRef.current[el.id] = node; 
                  }}
                />
              );
            }

            // TEXT / SIGNATURE
            if (["text", "signature"].includes(el.type)) {
              const effectiveAlign = el.type === "signature" ? "center" : el.textAlign === "center" ? "center" : el.textAlign === "right" ? "right" : "left";
              const elementWidth = el.width ?? 200;
              let xPos = el.x;
              if (effectiveAlign === "center") xPos = el.x - elementWidth / 2;
              else if (effectiveAlign === "right") xPos = el.x - elementWidth;

              const transformedText = (() => {
                const content = el.content || "";
                if (!el.textTransform || el.textTransform === "none") return content;
                const tt = el.textTransform as string;
                if (tt === "upper" || tt === "uppercase") return content.toUpperCase();
                if (tt === "lower" || tt === "lowercase") return content.toLowerCase();
                if (tt === "title" || tt === "capitalize") return content.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                return content;
              })();

              if (editingId === el.id) return null;

              return (
                <Text
                  key={el.id}
                  text={transformedText}
                  x={xPos} y={el.y}
                  width={elementWidth}
                  fontSize={el.fontSize ?? 16}
                  fontFamily={el.fontFamily ?? "Arial"}
                  fill={el.color ?? "#000000"}
                  fontStyle={el.fontStyle ?? "normal"}
                  fontVariant={el.fontWeight === "bold" ? "bold" : "normal"}
                  textDecoration={el.textDecoration ?? ""}
                  align={effectiveAlign}
                  draggable={isEditable}
                  perfectDrawEnabled={false}
                  onClick={() => handleSelect(el.id)}
                  onTap={() => handleSelect(el.id)}
                  onDblClick={(e) => handleTextDblClick(el, e.target as Konva.Text)}
                  onDblTap={(e) => handleTextDblClick(el, e.target as Konva.Text)}
                  onDragMove={handleDragMove}
                  onDragEnd={(e) => {
                    setGuides([]); 
                    const visualLeft = e.target.x();
                    const visualTop = e.target.y();
                    let newStorageX = visualLeft;
                    if (effectiveAlign === "center") newStorageX = visualLeft + (elementWidth / 2);
                    else if (effectiveAlign === "right") newStorageX = visualLeft + elementWidth;
                    const updates = { x: newStorageX, y: visualTop };
                    if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                    else onElementUpdate?.(el.id, updates);
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const sX = node.scaleX(); const sY = node.scaleY();
                    node.scaleX(1); node.scaleY(1);
                    const newWidth = Math.max(5, node.width() * sX);
                    const newHeight = Math.max(5, node.height() * sY);
                    const visualLeft = node.x(); const visualTop = node.y();
                    let newStorageX = visualLeft;
                    if (effectiveAlign === "center") newStorageX = visualLeft + (newWidth / 2);
                    else if (effectiveAlign === "right") newStorageX = visualLeft + newWidth;
                    const updates = { x: newStorageX, y: visualTop, width: newWidth, height: newHeight, rotation: node.rotation() };
                    if (onElementFinalUpdate) onElementFinalUpdate(el.id, updates);
                    else onElementUpdate?.(el.id, updates);
                  }}
                  ref={(node) => { 
                    if (node) itemsRef.current[el.id] = node; 
                  }}
                />
              );
            }
            return null;
          })}
          
          {guides.map((guide, i) => <Line key={i} points={guide.points} stroke="#ff00ff" strokeWidth={1} dash={[4, 4]} />)}

          {/* ⭐️ CHANGED: Render a Transformer for EACH selected ID */}
          {activeSelectionIds.map((id) => {
            const node = itemsRef.current[id];
            if (!node) return null;
            return (
                <Transformer
                    key={`tr-${id}`}
                    nodes={[node]}
                    boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
                    }
                />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}