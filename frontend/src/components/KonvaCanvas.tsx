//KonvaCanvas.tsx

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from "react-konva";
import Konva from "konva";
import { CertificateElement } from "../types/certificate";

interface KonvaCanvasProps {
  width: number;
  height: number;
  elements: CertificateElement[];
  onElementSelect?: (id: string | null) => void;
  onElementUpdate?: (id: string, updates: Partial<CertificateElement>) => void;
}

interface ImageElement {
  id: string;
  image: HTMLImageElement;
  element: CertificateElement;
}

export default function KonvaCanvas({
  width,
  height,
  elements,
  onElementSelect,
  onElementUpdate,
}: KonvaCanvasProps) {
  console.log("🖼️ KonvaCanvas rendering with:", {
    width,
    height,
    elementCount: elements.length,
    elements: elements
  });

  const [images, setImages] = useState<ImageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Node | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      const imageElements = elements.filter((el) => el.imageUrl);
      const loadedImages: ImageElement[] = [];

      for (const element of imageElements) {
        if (element.imageUrl) {
          try {
            const img = new window.Image();
            img.crossOrigin = "anonymous";

            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = element.imageUrl!;
            });

            loadedImages.push({
              id: element.id,
              image: img,
              element,
            });
          } catch (error) {
            console.error(`Failed to load image for element ${element.id}:`, error);
          }
        }
      }

      setImages(loadedImages);
    };

    loadImages();
  }, [elements]);

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

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, elementId: string) => {
    onElementUpdate?.(elementId, {
      x: e.target.x(),
      y: e.target.y(),
    });
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
    });
  };

  const handleTextChange = (elementId: string, newText: string) => {
    onElementUpdate?.(elementId, {
      content: newText,
    });
  };




  
  const sortedElements = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const textElements = sortedElements.filter((el) => el.type === "text" || el.type === "signature");

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
          {images.map((img) => {
            const isSelected = selectedId === img.id;
            const scaleX = img.element.width ? img.element.width / img.image.width : 1;
            const scaleY = img.element.height ? img.element.height / img.image.height : 1;

            return (
              <KonvaImage
                key={img.id}
                image={img.image}
                x={img.element.x}
                y={img.element.y}
                scaleX={scaleX}
                scaleY={scaleY}
                opacity={img.element.opacity ?? 1}
                draggable
                onClick={() => handleSelect(img.id)}
                onTap={() => handleSelect(img.id)}
                onDragEnd={(e) => handleDragEnd(e, img.id)}
                onTransformEnd={(e) => handleTransformEnd(e, img.id)}
                ref={(node) => {
                  if (isSelected) {
                    selectedShapeRef.current = node;
                  }
                }}
              />
            );
          })}

          {textElements.map((element) => {
            const isSelected = selectedId === element.id;
            const textAlign = element.textAlign === "center" ? "center" : element.textAlign === "right" ? "right" : "left";

            return (
              <Text
                key={element.id}
                text={element.content || ""}
                x={element.x - (element.width ?? 200) / 2}
                y={element.y}
                width={element.width ?? 200}
                fontSize={element.fontSize ?? 16}
                fontFamily={element.fontFamily ?? "Arial"}
                fill={element.color ?? "#000000"}
                fontStyle={element.fontWeight === "bold" ? "bold" : "normal"}
                align={textAlign}
                draggable
                onClick={() => handleSelect(element.id)}
                onTap={() => handleSelect(element.id)}
                onDragEnd={(e) => handleDragEnd(e, element.id)}
                onTransformEnd={(e) => handleTransformEnd(e, element.id)}
                onDblClick={(e) => {
                  const textNode = e.target as Konva.Text;
                  const stage = textNode.getStage();
                  if (!stage) return;

                  textNode.hide();
                  const textarea = document.createElement("textarea");
                  document.body.appendChild(textarea);

                  const textPosition = textNode.getClientRect();
                  const stageBox = stage.container().getBoundingClientRect();
                  const areaPosition = {
                    x: stageBox.left + textPosition.x,
                    y: stageBox.top + textPosition.y,
                  };

                  textarea.value = textNode.text();
                  textarea.style.position = "absolute";
                  textarea.style.top = areaPosition.y + "px";
                  textarea.style.left = areaPosition.x + "px";
                  textarea.style.width = textNode.width() - (textNode.padding() * 2) + "px";
                  textarea.style.fontSize = textNode.fontSize() + "px";
                  textarea.style.border = "none";
                  textarea.style.padding = "0px";
                  textarea.style.margin = "0px";
                  textarea.style.overflow = "hidden";
                  textarea.style.background = "none";
                  textarea.style.outline = "none";
                  textarea.style.resize = "none";
                  textarea.style.lineHeight = textNode.lineHeight().toString();
                  textarea.style.fontFamily = textNode.fontFamily();
                  textarea.style.transformOrigin = "left top";
                  textarea.style.textAlign = textNode.align();
                  textarea.style.color = String(textNode.fill());

                  textarea.focus();

                  textarea.addEventListener("keydown", (e) => {
                    if (e.key === "Escape") {
                      textNode.show();
                      document.body.removeChild(textarea);
                    }
                  });

                  textarea.addEventListener("blur", () => {
                    handleTextChange(element.id, textarea.value);
                    textNode.show();
                    document.body.removeChild(textarea);
                  });
                }}
                ref={(node) => {
                  if (isSelected) {
                    selectedShapeRef.current = node;
                  }
                }}
              />
            );
          })}

          {selectedId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
