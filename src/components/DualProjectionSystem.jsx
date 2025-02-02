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
    { id: 'focus1', x: 200, y: 600, fixed: true },
    { id: 'focus2', x: 400, y: 600, fixed: true }
  ]);
  const [projectionType, setProjectionType] = useState('orthogonal'); // or 'perspective'

  const [trails, setTrails] = useState({}); // Store trails for each point
  const MAX_TRAIL_LENGTH = 100; // Maximum number of positions to remember
  const [lastTrailUpdate, setLastTrailUpdate] = useState({});  // Add this with other state declarations
  const TRAIL_UPDATE_INTERVAL = 50; // Update trail every 100ms


  const boxRef = useRef(null);
  const PERPENDICULAR_LENGTH = 700;
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

  const updateTrails = (pointId, proj1, proj2) => {
    if (!proj1 || !proj2) return;

    // Get current timestamp
    const now = Date.now();

    // Check if enough time has passed since last update for this point
    if (lastTrailUpdate[pointId] && (now - lastTrailUpdate[pointId]) < TRAIL_UPDATE_INTERVAL) {
      return; // Skip this update if not enough time has passed
    } else {
      lastTrailUpdate[pointId] = now; 
    }
    
    // Calculate plot coordinates
    const plotX = 300 + (proj1.distance / 2);
    const plotY = 300 - (proj2.distance / 2);
    
    setTrails(prevTrails => {
      // Get existing trail or create new one
      const trail = prevTrails[pointId] || [];
      
      // Add new position
      const newTrail = [...trail, { x: plotX, y: plotY }];
      
      // Keep only the last MAX_TRAIL_LENGTH positions
      if (newTrail.length > MAX_TRAIL_LENGTH) {
        newTrail.shift(); // Remove oldest position
      }
      
      const updatedTrails = {
        ...prevTrails,
        [pointId]: newTrail
      };
      
      // console.log('Updated trails:', updatedTrails); // Debug log
      return updatedTrails;
    });
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

      // Update trails for the dragged point
      const point = points.find(p => p.id === draggedPoint);
      if (point && anchorPoint) {
        const proj1 = calculateProjection(point, focusPoints[0], perpLines[0]);
        const proj2 = calculateProjection(point, focusPoints[1], perpLines[1]);
        updateTrails(draggedPoint, proj1, proj2);
      }
    }
  };

  const stopDragging = () => {
    setDraggedPoint(null);
  };

  const rotatePoints = () => {
    if (!anchorPoint) return;
    
    const anchor = points.find(p => p.id === anchorPoint);
    if (!anchor) return;

    setPoints(prevPoints => {
      const newPoints = prevPoints.map(point => {
        if (point.id === anchorPoint) return point;
  
        // Calculate rotation
        const dx = point.x - anchor.x;
        const dy = point.y - anchor.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const currentAngle = Math.atan2(dy, dx);
        const newAngle = currentAngle + (Math.PI / 180);
  
        return {
          ...point,
          x: anchor.x + radius * Math.cos(newAngle),
          y: anchor.y + radius * Math.sin(newAngle)
        };
      });
  
      // Update trails for all rotating points
      newPoints.forEach(point => {
        if (point.id !== anchorPoint) {
          const proj1 = calculateProjection(point, focusPoints[0], perpLines[0]);
          const proj2 = calculateProjection(point, focusPoints[1], perpLines[1]);
          updateTrails(point.id, proj1, proj2);
        }
      });
  
      return newPoints;
    });

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

    const offsetX = 50 * unitX;
    const offsetY = 50 *unitY;

    if (projectionType=='orthogonal'){
      return {
        x1: focusPoint.x - perpX * PERPENDICULAR_LENGTH / 2,
        y1: focusPoint.y - perpY * PERPENDICULAR_LENGTH / 2,
        x2: focusPoint.x + perpX * PERPENDICULAR_LENGTH / 2,
        y2: focusPoint.y + perpY * PERPENDICULAR_LENGTH / 2,
      };
    }else{
      return {
        x1: focusPoint.x - perpX * PERPENDICULAR_LENGTH / 2 + offsetX,
        y1: focusPoint.y - perpY * PERPENDICULAR_LENGTH / 2 + offsetY,
        x2: focusPoint.x + perpX * PERPENDICULAR_LENGTH / 2 + offsetX,
        y2: focusPoint.y + perpY * PERPENDICULAR_LENGTH / 2 + offsetY
      };
    }
  };

  const calculateProjection = (point, focusPoint, perpLine) => {
    if (!anchorPoint || !perpLine) return null;
    
    const anchor = points.find(p => p.id === anchorPoint);
    if (!anchor) return null;

    if (projectionType === 'orthogonal') {
        // Current orthogonal projection logic
        const px = point.x - focusPoint.x;
        const py = point.y - focusPoint.y;

        const perpLength = Math.sqrt((perpLine.x2 - perpLine.x1) ** 2 + 
                                   (perpLine.y2 - perpLine.y1) ** 2);
        const perpUnitX = (perpLine.x2 - perpLine.x1) / perpLength;
        const perpUnitY = (perpLine.y2 - perpLine.y1) / perpLength;

        const dot = px * perpUnitX + py * perpUnitY;
        
        return {
            x: focusPoint.x + perpUnitX * dot,
            y: focusPoint.y + perpUnitY * dot,
            distance: dot
        };
    } else {
        // New perspective projection logic
        // Calculate intersection of line from focus through point with perpendicular line
        const dx = point.x - focusPoint.x;
        const dy = point.y - focusPoint.y;
        
        // Line from focus through point: p = focusPoint + t * (dx, dy)
        // Perpendicular line: p = perpLine.x1 + s * (perpLine.x2 - perpLine.x1)
        // Solve for intersection
        const perpDx = perpLine.x2 - perpLine.x1;
        const perpDy = perpLine.y2 - perpLine.y1;
        
        // Using parametric equation intersection
        const denominator = dx * perpDy - dy * perpDx;
        if (Math.abs(denominator) < 1e-10) return null; // Lines are parallel
        
        const t = ((perpLine.x1 - focusPoint.x) * perpDy - 
                  (perpLine.y1 - focusPoint.y) * perpDx) / denominator;
        
        // if (t < 0) return null; // Intersection is behind focus point
        
        const intersectX = focusPoint.x + t * dx;
        const intersectY = focusPoint.y + t * dy;
        
        // Calculate signed distance along perpendicular line
        const s = ((intersectX - (perpLine.x1+ perpLine.x2) / 2) * perpDx + 
                  (intersectY - (perpLine.y1+ perpLine.y2) / 2) * perpDy) / 
                 (perpDx * perpDx + perpDy * perpDy);
        
        return {
            x: intersectX,
            y: intersectY,
            distance: s * Math.sqrt(perpDx * perpDx + perpDy * perpDy) * 10
        };
    }
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
            <Button 
            onClick={() => setProjectionType(prev => 
                prev === 'orthogonal' ? 'perspective' : 'orthogonal')}
            className="flex items-center gap-2"
            >
                {projectionType === 'orthogonal' ? 'Switch to Perspective' : 'Switch to Orthogonal'}
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

              {/* Draw trails */}
              {Object.entries(trails).map(([pointId, trail]) => {
                const numericPointId = Number(pointId);
                const point = points.find(p => p.id === numericPointId);
                if (!point || point.id === anchorPoint) return null;
                
                const svgColor = getSvgColor(point.color);
                
                // Create path data from trail points
                const pathData = trail.reduce((path, pos, index) => {
                  // For the first point, we "Move" the pen to that position
                  // For subsequent points, we draw a "Line" to that position
                  return path + (index === 0 ? `M ${pos.x} ${pos.y}` : ` L ${pos.x} ${pos.y}`);
                }, '');

                // We can create a gradient effect by using multiple paths
                // with different opacities and strokeWidths
                return (
                  <g key={`trail-${pointId}`}>
                    {/* Base path - wider and more transparent */}
                    <path
                      d={pathData}
                      stroke={svgColor}
                      strokeWidth="3"
                      fill="none"
                      opacity="0.2"
                    />
                    {/* Main path - thinner and more visible */}
                    <path
                      d={pathData}
                      stroke={svgColor}
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.6"
                    />
                  </g>
                );
              })}

            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DualProjectionSystem;