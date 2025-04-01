import PropTypes from 'prop-types';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-lg z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="pointer-events-auto relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all"
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

export default Modal; 