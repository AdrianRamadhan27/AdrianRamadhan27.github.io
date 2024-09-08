import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";

const PDFViewer = () => (
    <div
        style={{
            backgroundColor: '#fff',
            flexDirection: 'column',
            overflow: 'hidden',

            /* Fixed position */

            position: 'fixed',

            /* Take full size */
            height: '75%',
            width: '75%',

            
            /* Displayed on top of other elements */
            zIndex: 9999,
        }}
    >
        <div
            style={{
                alignItems: 'center',
                backgroundColor: '#000',
                color: '#fff',
                display: 'flex',
                padding: '.5rem',
            }}
        >
            <div style={{ marginRight: 'auto' }}>sample-file-name.pdf</div>
            <button
                style={{
                    backgroundColor: '#357edd',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: '8px',
                }}
                onClick={() => onClose(false)}
            >
                Close
            </button>
        </div>
        <div
            style={{
                flexGrow: 1,
                overflow: 'auto',
            }}
        >
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer fileUrl="files/MyCV.pdf"/>
            </Worker>
        </div>
    </div>
);

export default PDFViewer;