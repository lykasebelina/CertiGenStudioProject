import { CertificateElement } from "../types/certificate";

//const showDebugFrames = true; // ← set to false to hide the outlines

interface CertificateTemplateProps {
  elements?: CertificateElement[];
  onElementMove?: (id: string, x: number, y: number) => void;
  onElementSelect?: (id: string) => void;
}

export default function CertificateTemplate({
  elements = [],
  onElementMove,
  onElementSelect,
}: CertificateTemplateProps) {
  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", elementId);
  };

  const handleDrag = (e: React.DragEvent, element: CertificateElement) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (onElementMove && x > 0 && y > 0) {
      onElementMove(element.id, x, y);
    }
  };

  const clampTextForRender = (content?: string, maxChars?: number) => {
    const c = content ?? "";
    if (!maxChars || maxChars <= 0) return c;
    if (c.length <= maxChars) return c;
    if (maxChars === 1) return c.slice(0, 1);
    return c.slice(0, maxChars - 1) + "…";
  };

  const renderElement = (element: CertificateElement) => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: element.textFrameWidth ? `${element.textFrameWidth}px` : element.width ? `${element.width}px` : "auto",
      height: element.textFrameHeight ? `${element.textFrameHeight}px` : element.height ? `${element.height}px` : "auto",
      zIndex: element.zIndex ?? 1,
      opacity: element.opacity ?? 1,
      cursor: "move",
      userSelect: "none",
    };

    if (element.type === "text" || element.type === "signature") {
      baseStyle.transform = "translateX(-50%)";
    }

    // 🌈 BACKGROUND
    if (element.type === "background") {
      const backgroundStyle: React.CSSProperties = {
        ...baseStyle,
        cursor: "default",
      };

      if (
        element.imageUrl?.startsWith("linear-gradient") ||
        element.imageUrl?.startsWith("radial-gradient")
      ) {
        (backgroundStyle as any).background = element.imageUrl;
      } else if (element.imageUrl) {
        (backgroundStyle as any).backgroundImage = `url(${element.imageUrl})`;
        (backgroundStyle as any).backgroundSize = "cover";
        (backgroundStyle as any).backgroundPosition = "center";
      } else if (element.backgroundColor) {
        backgroundStyle.backgroundColor = element.backgroundColor;
      }

      return (
        <div
          key={element.id}
          draggable
          onDragStart={(e) => handleDragStart(e, element.id)}
          onDrag={(e) => handleDrag(e, element)}
          onClick={() => onElementSelect?.(element.id)}
          style={backgroundStyle}
        />
      );
    }

    // 🖼️ GENERIC IMAGE (Logos, Watermarks, User Uploads)
    if (element.type === "image") {
      const imageStyle: React.CSSProperties = {
        ...baseStyle,
        backgroundImage: `url(${element.imageUrl})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      };
      
      return (
        <div
          key={element.id}
          draggable
          onDragStart={(e) => handleDragStart(e, element.id)}
          onDrag={(e) => handleDrag(e, element)}
          onClick={() => onElementSelect?.(element.id)}
          style={imageStyle}
        />
      );
    }

    // 🟦 BORDER
    if (element.type === "border") {
      const borderStyle: React.CSSProperties = {
        ...baseStyle,
        pointerEvents: "none", // prevents interfering with dragging text
      };

      if (element.imageUrl) {
        borderStyle.backgroundImage = `url(${element.imageUrl})`;
        borderStyle.backgroundSize = "cover";
        borderStyle.backgroundPosition = "center";
      } else if (element.content) {
        borderStyle.border = element.content;
        borderStyle.boxSizing = "border-box";
      }

      return <div key={element.id} style={borderStyle} />;
    }

    // 🟪 CORNER FRAME (rotated mini-panels)
    if (element.type === "cornerFrame") {
      const style: React.CSSProperties = {
        ...baseStyle,
        transform: `rotate(${element.rotate ?? 45}deg)`,
        transformOrigin: "center",
        backgroundColor: element.backgroundColor,
        backgroundImage: element.imageUrl ? `url(${element.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: 0,
        pointerEvents: "auto",
      };

      return (
        <div
          key={element.id}
          draggable
          onDragStart={(e) => handleDragStart(e, element.id)}
          onDrag={(e) => handleDrag(e, element)}
          onClick={() => onElementSelect?.(element.id)}
          style={style}
        />
      );
    }

    // ⬜ INNER FRAME (white rectangle)
    if (element.type === "innerFrame") {
      const innerFrameStyle: React.CSSProperties = {
        ...baseStyle,
        backgroundColor: element.backgroundColor || "#ffffff",
        border: element.borderWidth
          ? `${element.borderWidth}px ${element.borderStyle ?? "solid"} ${element.borderColor ?? "#000"}`
          : undefined,
        boxSizing: "border-box",
        pointerEvents: "auto",
        cursor: "pointer",
      };

      return (
        <div
          key={element.id}
          draggable
          onDragStart={(e) => handleDragStart(e, element.id)}
          onDrag={(e) => handleDrag(e, element)}
          onClick={() => onElementSelect?.(element.id)}
          style={innerFrameStyle}
        />
      );
    }

    // 🖋️ TEXT / SIGNATURE STYLE RENDER
    if (element.type === "text" || element.type === "signature") {
      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontFamily: element.fontFamily ?? "Arial",
        ...(element.fontFamily ? { fontFamily: element.fontFamily } : {}),
        fontSize: element.fontSize ? `${element.fontSize}px` : "14px",
        fontWeight: element.bold ? "bold" : element.fontWeight ?? "normal",
        fontStyle: element.italic ? "italic" : "normal",
        textDecoration: element.underline ? "underline" : "none",
        textAlign: (element.textAlign as "left" | "center" | "right") ?? element.align ?? "center",
        letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
        textTransform: element.textTransform ?? "none",
        color: element.color ?? "#000000",
        whiteSpace: "pre-line",
        lineHeight: element.type === "signature" ? "1.4" : "1.6",
        width: element.textFrameWidth ? `${element.textFrameWidth}px` : element.width ? `${element.width}px` : "auto",
        height: element.textFrameHeight ? `${element.textFrameHeight}px` : element.height ? `${element.height}px` : "auto",
        overflow: "hidden",
        boxSizing: "border-box",
        pointerEvents: "auto",




 //FRAME OUTLINE SHOW


//outline: showDebugFrames ? "1px dashed red" : "none",
//backgroundColor: showDebugFrames ? "rgba(255,0,0,0.05)" : "transparent",


      };


      
      const displayedContent = clampTextForRender(element.content, element.maxChars);

      return (
        <div
          key={element.id}
          draggable
          onDragStart={(e) => handleDragStart(e, element.id)}
          onDrag={(e) => handleDrag(e, element)}
          onClick={() => onElementSelect?.(element.id)}
          style={textStyle}
        >
          {displayedContent}
        </div>
      );
    } 

    return null;
  };

  if (elements.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <p className="text-slate-500 text-lg">No elements generated yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white overflow-hidden rounded-0 shadow-md">
      {elements
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((element) => renderElement(element))}
    </div>
  );
}