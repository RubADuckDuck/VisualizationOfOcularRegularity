import React from 'react'; // Add this line
import { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { PlusCircle, Trash2, Anchor, Crosshair, RotateCw } from 'lucide-react'

const tailwindToSvgColors = {
  'bg-blue-500': '#3b82f6', // Replace with the correct hex code
  'bg-blue-600': '#2563eb', // Replace with the correct hex code
  'bg-green-500': '#22c55e', // Replace with the correct hex code
  'bg-green-600': '#16a340', // Replace with the correct hex code
  'bg-purple-500': '#6b46c1', // Replace with the correct hex code
  'bg-purple-600': '#5228f5', // Replace with the correct hex code
  'bg-pink-500': '#ec4899', // Replace with the correct hex code
  'bg-pink-600': '#db2777', // Replace with the correct hex code
  'bg-yellow-500': '#facc15', // Replace with the correct hex code
  'bg-yellow-600': '#eab308', // Replace with the correct hex code
  // ... add more mappings as needed
};

const colors = [
  'bg-blue-500 hover:bg-blue-600',
  'bg-green-500 hover:bg-green-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-pink-500 hover:bg-pink-600',
  'bg-yellow-500 hover:bg-yellow-600',
];

// Function to get the SVG color from a Tailwind class
function getSvgColor(tailwindClass) {
  const baseClass = tailwindClass.split(' ')[0];
  return tailwindToSvgColors[baseClass] || null; // Returns null if not found
}


const DualProjectionSystem = () => {
  const [points, setPoints] = useState([]);
  const [draggedPoint, setDraggedPoint] = useState(null);
  const [anchorPoint, setAnchorPoint] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const rotationInterval = useRef(null);
  const [focusPoints] = useState([
    { id: 'focus1', x: 200, y: 150, fixed: true },
    { id: 'focus2', x: 400, y: 150, fixed: true }
  ]);
  const boxRef = useRef(null);
  const PERPENDICULAR_LENGTH = 300;
  const GRID_SIZE = 200;

  const addPoint = () => {
    const newPoint = {
      id: Date.now(),
      x: 100,
      y: 100,
      color: colors[points.length % colors.length]
    };
    setPoints([...points, newPoint]);
  };

  const removePoint = (id) => {
    if (anchorPoint === id) setAnchorPoint(null);
    setPoints(points.filter(point => point.id !== id));
  };

  const startDragging = (e, pointId) => {
    e.preventDefault();
    setDraggedPoint(pointId);
  };

  const handleMouseMove = (e) => {
    if (draggedPoint !== null && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
      const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

      setPoints(points.map(point => 
        point.id === draggedPoint 
          ? { ...point, x, y }
          : point
      ));
    }
  };

  const stopDragging = () => {
    setDraggedPoint(null);
  };

  const rotatePoints = () => {
    if (!anchorPoint) return;
    
    const anchor = points.find(p => p.id === anchorPoint);
    if (!anchor) return;

    setPoints(prevPoints => prevPoints.map(point => {
      if (point.id === anchorPoint) return point;

      // Calculate rotation
      const dx = point.x - anchor.x;
      const dy = point.y - anchor.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx);
      const newAngle = currentAngle + (Math.PI / 180); // Rotate by 1 degree

      return {
        ...point,
        x: anchor.x + radius * Math.cos(newAngle),
        y: anchor.y + radius * Math.sin(newAngle)
      };
    }));

    setRotationAngle(prev => (prev + 1) % 360);
  };

  const toggleRotation = () => {
    if (!isRotating) {
      rotationInterval.current = setInterval(rotatePoints, 16); // ~60fps
    } else {
      clearInterval(rotationInterval.current);
    }
    setIsRotating(!isRotating);
  };

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
      }
    };
  }, []);

  const toggleAnchor = (pointId) => {
    setAnchorPoint(anchorPoint === pointId ? null : pointId);
  };

  const calculatePerpendicularLine = (focusPoint) => {
    if (!anchorPoint) return null;
    
    const anchor = points.find(p => p.id === anchorPoint);
    if (!anchor) return null;

    const dx = focusPoint.x - anchor.x;
    const dy = focusPoint.y - anchor.y;
    
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return null;

    const unitX = dx / length;
    const unitY = dy / length;

    const perpX = -unitY;
    const perpY = unitX;

    return {
      x1: focusPoint.x - perpX * PERPENDICULAR_LENGTH / 2,
      y1: focusPoint.y - perpY * PERPENDICULAR_LENGTH / 2,
      x2: focusPoint.x + perpX * PERPENDICULAR_LENGTH / 2,
      y2: focusPoint.y + perpY * PERPENDICULAR_LENGTH / 2
    };
  };

  const calculateProjection = (point, focusPoint, perpLine) => {
    if (!anchorPoint || !perpLine) return null;
    
    const anchor = points.find(p => p.id === anchorPoint);
    if (!anchor) return null;

    const px = point.x - focusPoint.x;
    const py = point.y - focusPoint.y;

    const perpLength = Math.sqrt((perpLine.x2 - perpLine.x1) ** 2 + (perpLine.y2 - perpLine.y1) ** 2);
    const perpUnitX = (perpLine.x2 - perpLine.x1) / perpLength;
    const perpUnitY = (perpLine.y2 - perpLine.y1) / perpLength;

    const dot = px * perpUnitX + py * perpUnitY;
    
    return {
      x: focusPoint.x + perpUnitX * dot,
      y: focusPoint.y + perpUnitY * dot,
      distance: dot
    };
  };

  const perpLines = focusPoints.map(fp => calculatePerpendicularLine(fp));

  return (
    <div className="flex flex-wrap gap-4 justify-center w-full h-[calc(100vh-2rem)]">
      <Card className="flex-1 min-w-[700px] max-w-4xl min-h-[700px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            Dual Focus Projection System
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={toggleRotation}
              disabled={!anchorPoint}
              className={`flex items-center gap-2 ${isRotating ? 'bg-green-500' : ''}`}
            >
              <RotateCw className="w-4 h-4" />
              {isRotating ? 'Stop' : 'Start'} Rotation
            </Button>
            <Button 
              onClick={addPoint}
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Point
            </Button>
          </div>
        </CardHeader>
        <CardContent className="w-full h-full flex flex-col overflow-hidden">
          <div 
            ref={boxRef}
            className="relative min-h-[85%] bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
          >
            {/* SVG layer for lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {anchorPoint && (() => {
                const anchor = points.find(p => p.id === anchorPoint);
                if (anchor) {
                  return (
                    <>
                      {focusPoints.map((fp, idx) => (
                        <g key={fp.id}>
                          {/* Connection lines */}
                          <line
                            x1={anchor.x}
                            y1={anchor.y}
                            x2={fp.x}
                            y2={fp.y}
                            stroke={idx === 0 ? "#DC2626" : "#7C3AED"}
                            strokeWidth="2"
                          />
                          {/* Perpendicular lines */}
                          {perpLines[idx] && (
                            <line
                              x1={perpLines[idx].x1}
                              y1={perpLines[idx].y1}
                              x2={perpLines[idx].x2}
                              y2={perpLines[idx].y2}
                              stroke={idx === 0 ? "#DC2626" : "#7C3AED"}
                              strokeWidth="2"
                              strokeDasharray="4"
                            />
                          )}
                        </g>
                      ))}
                      {/* Projection lines and points */}
                      {points.map(point => {
                        if (point.id !== anchorPoint) {
                          return (
                            <g key={`proj-${point.id}`}>
                              {focusPoints.map((fp, idx) => {
                                const projection = calculateProjection(point, fp, perpLines[idx]); 
                                const svgColor = getSvgColor(point.color);
                                if (projection) {
                                  return (
                                    <g key={`proj-${point.id}-${fp.id}`}>
                                      <line
                                        x1={point.x}
                                        y1={point.y}
                                        x2={projection.x}
                                        y2={projection.y}
                                        stroke={svgColor}
                                        strokeWidth="1"
                                        strokeDasharray="2"
                                      />
                                      <circle
                                        cx={projection.x}
                                        cy={projection.y}
                                        r="4"
                                        fill={svgColor}
                                      />
                                    </g>
                                  );
                                }
                                return null;
                              })}
                            </g>
                          );
                        }
                        return null;
                      })}
                    </>
                  );
                }
              })()}
            </svg>

            {/* Fixed Focus Points */}
            {focusPoints.map((fp, idx) => (
              <div
                key={fp.id}
                className={`absolute w-6 h-6 rounded-full 
                         cursor-not-allowed -translate-x-3 -translate-y-3
                         shadow-lg ring-4 ${idx === 0 ? 'bg-red-500 ring-red-300' : 'bg-violet-500 ring-violet-300'}`}
                style={{
                  left: fp.x,
                  top: fp.y,
                }}
              >
                <div className="absolute -left-8 flex items-center">
                  <Crosshair className={`w-4 h-4 ${idx === 0 ? 'text-red-700' : 'text-violet-700'}`} />
                </div>
              </div>
            ))}

            {/* Regular Points */}
            {points.map((point) => (
              <div
                key={point.id}
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center 
                           ${point.color} 
                           cursor-move -translate-x-3 -translate-y-3
                           shadow-lg transition-colors duration-200
                           ${anchorPoint === point.id ? 'ring-4 ring-yellow-300' : ''}`}
                style={{
                  left: point.x,
                  top: point.y,
                }}
                onMouseDown={(e) => startDragging(e, point.id)}
              >
                <div className="absolute -left-8 flex flex-col items-center gap-1">
                  <button
                    className={`w-6 h-6 rounded-full flex items-center justify-center 
                               ${anchorPoint === point.id ? 'bg-yellow-500' : 'bg-gray-200'}
                               hover:scale-110 transition-transform`}
                    onClick={() => toggleAnchor(point.id)}
                  >
                    <Anchor className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    className="w-6 h-6 bg-red-500 rounded-full 
                               flex items-center justify-center
                               hover:scale-110 transition-transform"
                    onClick={() => removePoint(point.id)}
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2D Projection Plot */}
      <Card className="flex-1 min-w-[700px] max-w-4xl min-h-[700px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            2D Projection Plot
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full h-full flex flex-col overflow-hidden">
          <div className="relative min-h-[90%] bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full">
              {/* Coordinate axes */}
              <line x1="50" y1="300" x2="550" y2="300" stroke="black" strokeWidth="2" /> {/* X-axis */}
              <line x1="300" y1="50" x2="300" y2="550" stroke="black" strokeWidth="2" /> {/* Y-axis */}
              
              {/* Axis labels */}
              <text x="540" y="320" className="text-sm">Focus 1</text>
              <text x="310" y="60" className="text-sm">Focus 2</text>

              {/* Plot points */}
              {anchorPoint && points.map(point => {
                if (point.id === anchorPoint) return null;
                
                const proj1 = calculateProjection(point, focusPoints[0], perpLines[0]);
                const proj2 = calculateProjection(point, focusPoints[1], perpLines[1]);
                
                if (proj1 && proj2) {
                  // Scale and transform the coordinates to fit the plot
                  const plotX = 300 + (proj1.distance / 2);
                  const plotY = 300 - (proj2.distance / 2);
                  const svgColor = getSvgColor(point.color);
                  
                  return (
                    <g key={`plot-${point.id}`}>
                      <circle
                        cx={plotX}
                        cy={plotY}
                        r="5"
                        // fill={point.color.split(' ')[0]}
                        fill={svgColor}
                      />
                    </g>
                  );
                }
                return null;
              })}
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DualProjectionSystem;