import React from 'react';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning", // warning, danger, info
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertCircle className="text-red-500" size={48} />;
            case 'warning': return <AlertTriangle className="text-orange-500" size={48} />;
            default: return <Info className="text-blue-500" size={48} />;
        }
    };

    const getConfirmBtnColor = () => {
        switch (type) {
            case 'danger': return "bg-red-500 hover:bg-red-600";
            case 'warning': return "bg-orange-500 hover:bg-orange-600";
            default: return "bg-blue-600 hover:bg-blue-700";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="mb-4 p-3 bg-gray-50 rounded-full">
                        {getIcon()}
                    </div>

                    <div className="text-gray-600 whitespace-pre-line font-medium">
                        {message}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-600 font-bold text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={clsx(
                            "px-4 py-2 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2",
                            getConfirmBtnColor(),
                            isLoading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
