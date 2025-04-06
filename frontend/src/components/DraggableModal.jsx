import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';

const DraggableModal = ({ isOpen, onClose, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Center the modal when it opens
      const modal = modalRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const modalWidth = modal.offsetWidth;
      const modalHeight = modal.offsetHeight;

      setPosition({
        x: (viewportWidth - modalWidth) / 2,
        y: (viewportHeight - modalHeight) / 2
      });
    }
  }, [isOpen]);

  const handleMouseDown = (e) => {
    if (!e.target.closest('.modal-header')) return; // Only start drag if clicking header
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Get the modal and viewport dimensions
    const modal = modalRef.current;
    const modalRect = modal.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate bounds to keep modal within viewport
    const maxX = viewportWidth - modalRect.width;
    const maxY = viewportHeight - modalRect.height;

    // Constrain the position
    const constrainedX = Math.min(Math.max(0, newX), maxX);
    const constrainedY = Math.min(Math.max(0, newY), maxY);

    setPosition({
      x: constrainedX,
      y: constrainedY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50">
        <div 
          ref={modalRef}
          className="absolute"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[400px]"
            onMouseDown={handleMouseDown}
          >
            <div className={`modal-header h-8 bg-gray-100 dark:bg-gray-700 rounded-t-lg flex items-center px-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

DraggableModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

export default DraggableModal; 