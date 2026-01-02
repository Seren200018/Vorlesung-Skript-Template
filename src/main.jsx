//import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import { ReactDom,React,  useState } from "react";
import "../css/style.css";
import anime from 'animejs/lib/anime.es.js';

// Funktion: Ruft die aktuelle Scroll-Position ab
document.getScroll = function () {
    if (window.pageYOffset !== undefined) {
        return [pageXOffset, pageYOffset];
    } else {
        const d = document,
            r = d.documentElement,
            b = d.body;

        const sx = r.scrollLeft || b.scrollLeft || 0;
        const sy = r.scrollTop || b.scrollTop || 0;

        console.log(sy);
        return [sy];
    }
};
export default function FoldingLayout() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubPageOpen, setIsSubPageOpen] = useState(false);

    const handleSubPageClick = () => {
        if (!isSubPageOpen) {
            // Animate main page to fade out, sub page to slide left
            anime({
                targets: '.fold-wrapper',
                opacity: 0,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            anime({
                targets: '.sub-page-sheet',
                translateX: -290,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            setIsSubPageOpen(true);
        } else {
            // Close sub page
            anime({
                targets: '.fold-wrapper',
                opacity: 1,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            anime({
                targets: '.sub-page-sheet',
                translateX: 10,
                duration: 600,
                easing: 'easeInOutQuad'
            });
            setIsSubPageOpen(false);
        }
    };

    return (
        <div className="layout">
            <div className={`main ${isOpen ? "moved" : ""}`} onClick={() => setIsOpen(!isOpen)}>
                Click Me
            </div>

            <div className={`fold-wrapper ${isOpen ? "show" : ""}`}>
                <div className={`fold-top`}>Top Half</div>
                <div className={`fold-bottom ${isOpen ? "folded" : ""}`} onClick={handleSubPageClick}>Bottom Half</div>
            </div>

            <div className={`sub-page-sheet ${isOpen ? 'visible' : ''} ${isSubPageOpen ? 'open' : ''} explanation-sheet libertinus padding-10mm`}>
                <div className="sub-page-content">
                    <div className="sub-page-item">
                        <h2>Explanation 1</h2>
                        <p>This is the first explanation sheet.</p>
                    </div>
                    <div className="sub-page-item">
                        <h2>Explanation 2</h2>
                        <p>This is the second explanation sheet.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('ABC'));
root.render(<FoldingLayout />)