import React, { useEffect, useState, useRef } from 'react';

const WatermarkOverlay = ({ currentUser }) => {
    const [timestamp, setTimestamp] = useState(() => new Date().toLocaleString());
    const [ip, setIp] = useState('...');
    const canvasRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimestamp(new Date().toLocaleString());
        }, 60000);

        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIp(data.ip))
            .catch(() => setIp('IP Unavailable'));

        // Inject the Moiré animation keyframes
        const style = document.createElement('style');
        style.id = 'moire-keyframes';
        style.innerHTML = `
      @keyframes moireShift {
        0%   { background-position: 0px 0px, 0px 0px; }
        50%  { background-position: 2px 1px, 1px 2px; }
        100% { background-position: 0px 0px, 0px 0px; }
      }
    `;
        if (!document.getElementById('moire-keyframes')) {
            document.head.appendChild(style);
        }

        return () => {
            clearInterval(interval);
            const el = document.getElementById('moire-keyframes');
            if (el) el.remove();
        };
    }, []);

    // Canvas drawing effect for Cryptographic background
    useEffect(() => {
        if (!canvasRef.current || !currentUser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;

        const drawSecurityMesh = () => {
            if (!parent) return;
            const width = parent.offsetWidth;
            const height = parent.offsetHeight;
            
            // Set actual size in memory (scaled for retina displays)
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            ctx.clearRect(0, 0, width, height);

            const emailStr = currentUser.email || 'unknown';
            let seedHash = 0;
            for (let i = 0; i < emailStr.length; i++) {
                seedHash = ((seedHash << 5) - seedHash) + emailStr.charCodeAt(i);
                seedHash = seedHash & seedHash; // Convert to 32bit int
            }
            // Ensure positive
            seedHash = Math.abs(seedHash) || 12345;

            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';

            // Draw non-uniform algorithmic grid
            const gridSize = 14;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                // Wavy lines to prevent simple pattern clone-stamping
                ctx.lineTo(x + Math.sin((x + seedHash) * 0.05) * 8, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                // Wavy lines to prevent simple pattern clone-stamping
                ctx.lineTo(width, y + Math.cos((y + seedHash) * 0.05) * 8);
                ctx.stroke();
            }

            // Draw cryptographic hash-like noise dots
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            // Density relative to area
            const dotCount = (width * height) / 300; 
            for (let i = 0; i < dotCount; i++) {
                // Pseudo-random deterministic placement based on viewer email
                const hashValX = Math.sin(seedHash * i) * 10000;
                const px = hashValX - Math.floor(hashValX);
                
                const hashValY = Math.cos(seedHash * (i + 1)) * 10000;
                const py = hashValY - Math.floor(hashValY);

                const x = px * width;
                const y = py * height;
                
                ctx.fillRect(x, y, 1.5, 1.5);
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            // Use requestAnimationFrame to avoid ResizeObserver loop limit exceeded error
            window.requestAnimationFrame(() => drawSecurityMesh());
        });
        
        resizeObserver.observe(parent || document.body);

        return () => resizeObserver.disconnect();
    }, [currentUser]);

    if (!currentUser) return null;

    const name = currentUser.name || currentUser.email?.split('@')[0] || 'Unknown';
    const email = currentUser.email || 'unknown@secure';
    const identityLine = `${name}  •  ${email}  •  IP: ${ip}  •  ${timestamp}`;

    const rows = Array.from({ length: 30 });
    const cols = Array.from({ length: 6 });

    return (
        <div className="absolute inset-0 z-[9100] pointer-events-none overflow-hidden select-none">

            {/* ── LAYER 0: Tamper-Evident Cryptographic Noise (Defeats AI Erasers) ── */}
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full mix-blend-multiply opacity-50"
            />

            {/* ── LAYER 1: Subtle Moiré Mesh (disruptive to cameras, barely noticeable to human eyes) ── */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
            repeating-linear-gradient(0deg,  rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 6px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 7px)
          `,
                    backgroundSize: '6px 6px, 7px 7px',
                    animation: 'moireShift 4s linear infinite',
                }}
            />

            {/* ── LAYER 2: Identity Watermark — light enough to read through, clear in a photo ── */}
            <div
                className="absolute inset-0"
                style={{
                    transform: 'rotate(-30deg)',
                    transformOrigin: 'center center',
                    width: '160%',
                    height: '160%',
                    top: '-30%',
                    left: '-30%',
                }}
            >
                {rows.map((_, rIndex) => (
                    <div
                        key={rIndex}
                        style={{
                            display: 'flex',
                            width: '200%',
                            marginBottom: '52px',
                        }}
                    >
                        {cols.map((_, cIndex) => (
                            <span
                                key={cIndex}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: 'rgba(180, 30, 30, 0.22)',
                                    whiteSpace: 'nowrap',
                                    marginRight: '64px',
                                    letterSpacing: '0.04em',
                                    userSelect: 'none',
                                }}
                            >
                                🔒 {identityLine}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WatermarkOverlay;
