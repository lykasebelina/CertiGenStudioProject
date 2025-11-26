// src/components/KonvaCanvas.tsx

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Line } from "react-konva";
import Konva from "konva";
import { CertificateElement } from "../types/certificate";

interface KonvaCanvasProps {
  width: number;
  height: number;
  elements: CertificateElement[];
  onElementSelect?: (id: string | null) => void;
  onElementUpdate?: (id: string, updates: Partial<CertificateElement>) => void;
  onImagesLoaded?: () => void;
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

const base64Cache: Record<string, string> = {};

async function fetchImageAsBase64(url: string): Promise<string> {
  if (base64Cache[url]) return base64Cache[url];
  try {
    const isDalleUrl = /oaidalleapiprodscus\.blob\.core\.windows\.net\/private/.test(url);
    const fetchUrl = isDalleUrl ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        typeof reader.result === "string" ? resolve(reader.result) : reject("Failed to convert image");
      reader.onerror = () => reject("FileReader error");
      reader.readAsDataURL(blob);
    });
    base64Cache[url] = base64;
    return base64;
  } catch (err) {
    console.error("fetchImageAsBase64 error:", err);
    throw err;
  }
}

export default function KonvaCanvas({
  width,
  height,
  elements,
  onElementSelect,
  onElementUpdate,
  onImagesLoaded,
}: KonvaCanvasProps) {
  const [images, setImages] = useState<ImageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Node | null>(null);

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
          img.crossOrigin = "anonymous";
          const base64Url = await fetchImageAsBase64(element.imageUrl!);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = base64Url;
          });
          loadedImages.push({ id: element.id, image: img, element });
        } catch (err) {
          console.error(`Failed to load image ${element.id}:`, err);
        }
      }
      setImages(loadedImages);
      onImagesLoaded?.();
    };
    loadImages();
  }, [elements, onImagesLoaded]);

  useEffect(() => {
    if (transformerRef.current && selectedShapeRef.current) {
      transformerRef.current.nodes([selectedShapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onElementSelect?.(id);
  };

  const handleDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      onElementSelect?.(null);
    }
  };

  const SNAP_THRESHOLD = 30;

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
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
      
      newGuides.push({
        orientation: 'vertical',
        points: [stageCenterX, 0, stageCenterX, stage.height()]
      });
    }

    if (Math.abs(nodeCenterY - stageCenterY) < SNAP_THRESHOLD) {
      const shiftY = stageCenterY - nodeCenterY;
      newY = node.y() + shiftY;

      newGuides.push({
        orientation: 'horizontal',
        points: [0, stageCenterY, stage.width(), stageCenterY]
      });
    }

    node.position({ x: newX, y: newY });
    setGuides(newGuides);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, elementId: string) => {
    setGuides([]); 
    onElementUpdate?.(elementId, { x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, elementId: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    onElementUpdate?.(elementId, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div className="shadow-lg border border-slate-300">
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onMouseDown={handleDeselect}
        onTouchStart={handleDeselect}
        style={{ backgroundColor: "#ffffff" }}
      >
        <Layer>
          {sortedElements.map((el) => {
            const isSelected = selectedId === el.id;

            // 🖼️ IMAGE and BACKGROUND
            if (["image", "background"].includes(el.type)) {
              const imgObj = images.find((i) => i.id === el.id);
              if (!imgObj) return null;
              const scaleX = el.width ? el.width / imgObj.image.width : 1;
              const scaleY = el.height ? el.height / imgObj.image.height : 1;

              return (
                <KonvaImage
                  key={el.id}
                  image={imgObj.image}
                  x={el.x}
                  y={el.y}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  rotation={el.rotate ?? 0}
                  opacity={el.opacity ?? 1}
                  draggable
                  onClick={() => handleSelect(el.id)}
                  onTap={() => handleSelect(el.id)}
                  onDragMove={handleDragMove}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  ref={(node) => {
                    if (isSelected) selectedShapeRef.current = node;
                  }}
                />
              );
            }

            // 🟪 CORNER FRAME
            if (el.type === "cornerFrame") {
              const elWidth = el.width ?? 50;
              const elHeight = el.height ?? 50;
              const offsetX = elWidth / 2;
              const offsetY = elHeight / 2;
              const renderX = el.x + offsetX;
              const renderY = el.y + offsetY;

              if (el.imageUrl) {
                const imgObj = images.find((i) => i.id === el.id);
                if (!imgObj) return null;

                return (
                  <KonvaImage
                    key={el.id}
                    image={imgObj.image}
                    x={renderX}
                    y={renderY}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    width={elWidth} 
                    height={elHeight} 
                    rotation={el.rotate ?? 0}
                    draggable
                    onClick={() => handleSelect(el.id)}
                    onTap={() => handleSelect(el.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={(e) => {
                      setGuides([]); 
                      onElementUpdate?.(el.id, {
                        x: e.target.x() - offsetX,
                        y: e.target.y() - offsetY,
                      });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const sX = node.scaleX();
                      const sY = node.scaleY();
                      
                      node.scaleX(1);
                      node.scaleY(1);

                      const newWidth = Math.max(5, node.width() * sX);
                      const newHeight = Math.max(5, node.height() * sY);
                      
                      const newOffsetX = newWidth / 2;
                      const newOffsetY = newHeight / 2;

                      onElementUpdate?.(el.id, {
                        x: node.x() - newOffsetX,
                        y: node.y() - newOffsetY,
                        width: newWidth,
                        height: newHeight,
                        rotation: node.rotation(),
                      });
                    }}
                    ref={(node) => {
                      if (isSelected) selectedShapeRef.current = node;
                    }}
                  />
                );
              } else {
                return (
                  <Rect
                    key={el.id}
                    x={renderX}
                    y={renderY}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    width={elWidth}
                    height={elHeight}
                    fill={el.backgroundColor ?? "transparent"}
                    stroke={el.borderColor ?? "transparent"} 
                    strokeWidth={el.borderWidth ?? 0}
                    dash={
                      el.borderStyle === "dashed"
                        ? [10, 5]
                        : el.borderStyle === "dotted"
                        ? [2, 4]
                        : []
                    }
                    rotation={el.rotate ?? 0}
                    draggable={el.draggable ?? false}
                    onClick={() => handleSelect(el.id)}
                    onTap={() => handleSelect(el.id)}
                    onDragMove={handleDragMove}
                    onDragEnd={(e) => {
                      setGuides([]); 
                      onElementUpdate?.(el.id, {
                        x: e.target.x() - offsetX,
                        y: e.target.y() - offsetY,
                      });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const sX = node.scaleX();
                      const sY = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);

                      const newWidth = Math.max(5, node.width() * sX);
                      const newHeight = Math.max(5, node.height() * sY);
                      const newOffsetX = newWidth / 2;
                      const newOffsetY = newHeight / 2;

                      onElementUpdate?.(el.id, {
                        x: node.x() - newOffsetX,
                        y: node.y() - newOffsetY,
                        width: newWidth,
                        height: newHeight,
                        rotation: node.rotation(),
                      });
                    }}
                    ref={(node) => {
                      if (isSelected) selectedShapeRef.current = node;
                    }}
                  />
                );
              }
            }

            // 🟦 BORDER and INNER FRAME
            if (["border", "innerFrame"].includes(el.type)) {
              return (
                <Rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width ?? 100}
                  height={el.height ?? 100}
                  fill={el.backgroundColor ?? "transparent"}
                  stroke={el.borderColor ?? "#000000"}
                  strokeWidth={el.borderWidth ?? 2}
                  dash={
                    el.borderStyle === "dashed"
                      ? [10, 5]
                      : el.borderStyle === "dotted"
                      ? [2, 4]
                      : []
                  }
                  draggable={el.draggable ?? false}
                  onClick={() => handleSelect(el.id)}
                  onTap={() => handleSelect(el.id)}
                  onDragMove={handleDragMove}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  ref={(node) => {
                    if (isSelected) selectedShapeRef.current = node;
                  }}
                />
              );
            }

            // 🖋️ TEXT and SIGNATURE (UPDATED: SMOOTH DRAGGING LOGIC)
            if (["text", "signature"].includes(el.type)) {
              
              const effectiveAlign = el.type === "signature" 
                ? "center" 
                : el.textAlign === "center" ? "center" : el.textAlign === "right" ? "right" : "left";

              const elementWidth = el.width ?? 200;
              
              // Visual X position calculation
              let xPos = el.x;
              if (effectiveAlign === "center") {
                xPos = el.x - elementWidth / 2;
              } else if (effectiveAlign === "right") {
                xPos = el.x - elementWidth;
              }

              return (
                <Text
                  key={el.id}
                  text={el.content || ""}
                  x={xPos}
                  y={el.y}
                  width={elementWidth}
                  fontSize={el.fontSize ?? 16}
                  fontFamily={el.fontFamily ?? "Arial"}
                  fill={el.color ?? "#000000"}
                  fontStyle={el.fontWeight === "bold" ? "bold" : "normal"}
                  textDecoration={el.textDecoration ?? ""}
                  align={effectiveAlign}
                  draggable
                  onClick={() => handleSelect(el.id)}
                  onTap={() => handleSelect(el.id)}
                  onDragMove={handleDragMove}
                  
                  // 1. UPDATED Drag Logic: Converts Visual Top-Left back to Storage Coordinates
                  onDragEnd={(e) => {
                    setGuides([]); 
                    const visualLeft = e.target.x();
                    const visualTop = e.target.y();

                    let newStorageX = visualLeft;
                    // If aligned center/right, calculate storage X from visual Left
                    if (effectiveAlign === "center") {
                      newStorageX = visualLeft + (elementWidth / 2);
                    } else if (effectiveAlign === "right") {
                      newStorageX = visualLeft + elementWidth;
                    }

                    onElementUpdate?.(el.id, { 
                      x: newStorageX, 
                      y: visualTop 
                    });
                  }}

                  // 2. UPDATED Transform Logic: Recalculates storage X after resize
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const sX = node.scaleX();
                    const sY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);

                    const newWidth = Math.max(5, node.width() * sX);
                    const newHeight = Math.max(5, node.height() * sY);
                    
                    const visualLeft = node.x();
                    const visualTop = node.y();

                    let newStorageX = visualLeft;
                    if (effectiveAlign === "center") {
                        newStorageX = visualLeft + (newWidth / 2);
                    } else if (effectiveAlign === "right") {
                        newStorageX = visualLeft + newWidth;
                    }

                    onElementUpdate?.(el.id, {
                      x: newStorageX,
                      y: visualTop,
                      width: newWidth,
                      height: newHeight,
                      rotation: node.rotation(),
                    });
                  }}
                  ref={(node) => {
                    if (isSelected) selectedShapeRef.current = node;
                  }}
                />
              );
            }

            return null;
          })}

          {guides.map((guide, i) => (
            <Line
              key={i}
              points={guide.points}
              stroke="#ff00ff"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}

          {selectedId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
              }
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}