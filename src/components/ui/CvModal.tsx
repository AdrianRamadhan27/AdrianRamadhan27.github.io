import { useEffect } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { FiDownload } from "react-icons/fi";

const CvModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-tertiary relative flex h-full w-full max-w-4xl flex-col rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-black-100 flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-[16px] font-bold text-white">CV</h2>
          <div className="flex items-center gap-3">
            <a
              href={`${url}?download`}
              className="text-secondary hover:text-accent flex items-center gap-1 text-[14px]"
              download
            >
              <FiDownload /> Download
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-secondary hover:text-white"
            >
              <IoClose className="h-6 w-6" />
            </button>
          </div>
        </div>
        <iframe
          src={url}
          title="CV"
          className="h-full w-full flex-1 rounded-b-2xl bg-white"
        />
      </div>
    </div>,
    document.body
  );
};

export default CvModal;
