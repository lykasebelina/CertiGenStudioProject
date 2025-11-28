import React, { useRef, useEffect } from "react";
import { Image, Transformer } from "react-konva";
import useImage from "use-image";

// Helper to load image from URL
export const URLImage = ({ src, isSelected, onSelect, ...props }: any) => {
  const [image] = useImage(src);
  return (
    <Image
      image={image}
      onClick={onSelect}
      onTap={onSelect}
      draggable
      {...props}
    />
  );
};

// Generic Resizable Rectangle for Colors
export const ColorRect = ({ isSelected, onSelect, ...props }: any) => {
    return (
        <div /> // Placeholder logic handled in main file via <Rect>
    );
}

// Transformer component - Now uses ID (#) selector specifically
export const TransformerComponent = ({ selectedId }: { selectedId: string | null }) => {
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (trRef.current && selectedId) {
        const stage = trRef.current.getStage();
        // Find node by ID (note the #)
        const selectedNode = stage.findOne('#' + selectedId);
        
        if (selectedNode) {
          trRef.current.nodes([selectedNode]);
          trRef.current.getLayer().batchDraw();
        } else {
          trRef.current.nodes([]);
        }
    } else if (trRef.current) {
         // Clear selection if null
         trRef.current.nodes([]);
    }
  }, [selectedId]);

  return (
    <Transformer
      ref={trRef}
      boundBoxFunc={(oldBox, newBox) => {
        // Minimum size limit
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
};