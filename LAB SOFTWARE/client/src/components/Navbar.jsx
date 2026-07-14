import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, User, Menu, Camera, X, AlertCircle, Upload } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const Navbar = ({ onSearch, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const qrScannerRef = useRef(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const val = searchValue.trim().toUpperCase();
    if (!val) return;
    if (onSearch) {
      onSearch(val);
      setSearchValue('');
    }
  };

  // Also handle when user presses Enter in the search box directly
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // prevent useBarcodeScanner from also catching this
      const val = searchValue.trim().toUpperCase();
      if (!val) return;
      if (onSearch) {
        onSearch(val);
        setSearchValue('');
      }
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        qrScannerRef.current = null;
      }
    }
    setCameraOpen(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError('');
      
      // Reuse the existing scanner instance if available, or create one
      let scanner = qrScannerRef.current;
      
      if (scanner) {
        // Stop webcam scanner if it is currently scanning the camera
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } else {
        scanner = new Html5Qrcode("reader");
        qrScannerRef.current = scanner;
      }
      
      // Scan the image file
      const decodedText = await scanner.scanFile(file, true);
      
      if (onSearch) {
        onSearch(decodedText.trim().toUpperCase());
      }
      
      // Close the modal upon success
      setCameraOpen(false);
    } catch (err) {
      console.error("File scan error:", err);
      setCameraError("Failed to read QR/Barcode from the uploaded image. Please ensure it is clear and well-lit.");
    }
  };

  const restartWebcam = () => {
    setCameraError('');
    const current = selectedDevice;
    setSelectedDevice('');
    setTimeout(() => {
      setSelectedDevice(current || 'default');
    }, 50);
  };

  // Enumerate camera devices when modal opens
  useEffect(() => {
    if (cameraOpen) {
      Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
          setDevices(cameras);
          const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
          const defaultCam = backCam || cameras[0];
          setSelectedDevice(defaultCam.id);
        } else {
          setCameraError("No camera devices found.");
        }
      }).catch(err => {
        console.error("Error getting cameras:", err);
        setSelectedDevice('default');
      });
    } else {
      setDevices([]);
      setSelectedDevice('');
    }
  }, [cameraOpen]);

  // Camera start / restart effect
  useEffect(() => {
    if (cameraOpen && selectedDevice) {
      setCameraError('');
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5Qrcode("reader");
          qrScannerRef.current = scanner;
          
          const config = {
            fps: 15,
            qrbox: (width, height) => {
              const isDesktop = width > 640;
              const targetWidth = isDesktop ? 450 : 280;
              const targetHeight = isDesktop ? 220 : 160;
              return { 
                width: Math.min(width * 0.9, targetWidth), 
                height: Math.min(height * 0.8, targetHeight) 
              };
            },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.EAN_13
            ]
          };

          const cameraSource = selectedDevice === 'default' 
            ? { facingMode: "environment" } 
            : selectedDevice;

          scanner.start(
            cameraSource,
            config,
            async (decodedText) => {
              if (onSearch) {
                onSearch(decodedText.trim().toUpperCase());
              }
              await stopScanner();
            },
            () => {}
          ).then(() => {
            // Re-fetch cameras once permission is granted to load device names/labels
            Html5Qrcode.getCameras().then(cameras => {
              if (cameras && cameras.length > 0) {
                setDevices(cameras);
              }
            }).catch(() => {});
          }).catch(err => {
            console.error("Camera start error:", err);
            setCameraError("Camera access denied or device is already in use by another application.");
          });
        } catch (err) {
          console.error("Html5Qrcode setup error:", err);
          setCameraError("Failed to initialize camera scanner.");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (qrScannerRef.current) {
          const scanner = qrScannerRef.current;
          if (scanner.isScanning) {
            scanner.stop().catch(err => console.error("Unmount stop error:", err));
          }
          qrScannerRef.current = null;
        }
      };
    }
  }, [cameraOpen, selectedDevice, onSearch]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-3 sm:px-6 backdrop-blur-md dark:border-navy-800 dark:bg-navy-950/90">
        {/* Left: Hamburger + Greeting */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-600 hover:bg-slate-50 dark:border-navy-850 dark:text-navy-300 dark:hover:bg-navy-900 sm:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
          
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-navy-900 dark:text-white truncate max-w-[120px] sm:max-w-xs sm:text-base">
              Hi, <span className="text-coral-500">{user?.name?.split(' ')[0] || 'User'}</span>
            </h2>
            <p className="hidden sm:block text-[10px] text-navy-400 dark:text-navy-500 font-medium tracking-wide">
              Role: <span className="capitalize font-semibold">{user?.role}</span>
            </p>
          </div>
        </div>

        {/* Center: Barcode Search Box — hidden on mobile */}
        <form onSubmit={handleSearchSubmit} className="hidden max-w-sm flex-1 items-center gap-2 px-4 md:flex">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Type barcode & press Enter..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-10 text-sm text-navy-855 focus:border-coral-500 focus:bg-white focus:outline-none dark:border-navy-800 dark:bg-navy-900/50 dark:text-white dark:focus:bg-navy-900"
              style={{ fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400 hover:text-coral-500 transition-colors"
              title="Scan barcode/QR code using webcam camera"
              aria-label="Open camera scanner"
            >
              <Camera size={15} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span>Scanner Ready</span>
          </div>
        </form>

        {/* Right: Action Tray */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Camera Scan button — visible ONLY on mobile */}
          <button
            onClick={() => setCameraOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-600 hover:bg-slate-50 dark:border-navy-850 dark:text-navy-300 dark:hover:bg-navy-900 md:hidden"
            aria-label="Open camera barcode scanner"
            title="Scan barcode/QR code"
          >
            <Camera size={17} />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-600 hover:bg-slate-50 dark:border-navy-850 dark:text-navy-300 dark:hover:bg-navy-900"
            aria-label="Toggle dark mode"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full border border-slate-200 p-1 pr-2 sm:pr-3 hover:bg-slate-50 dark:border-navy-800 dark:hover:bg-navy-900"
              aria-label="Open user menu"
              aria-expanded={dropdownOpen}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-500/15 text-coral-500 dark:bg-coral-500/10 dark:text-coral-400">
                <User size={15} />
              </div>
              <span className="hidden text-xs font-semibold text-navy-700 dark:text-navy-300 sm:block">
                {user?.name?.split(' ')[0]}
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-navy-850 dark:bg-navy-900 z-20 animate-fade-in">
                  <div className="border-b border-slate-100 px-3 py-2.5 text-xs text-navy-400 dark:border-navy-800 dark:text-navy-500">
                    <p className="font-bold text-navy-900 dark:text-white truncate text-sm">{user?.name}</p>
                    <p className="truncate mt-0.5">{user?.phone}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-500/10 px-2 py-0.5 text-[10px] font-bold text-coral-500 mt-1">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors mt-1"
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Camera Barcode Scanner Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-fade-in">
          {/* Header */}
          <div className="flex h-16 w-full items-center justify-between border-b border-navy-850 bg-navy-950/90 px-6 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-coral-500/20 text-coral-500">
                <Camera size={18} className="animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <h3 className="text-xs font-extrabold text-white tracking-wider uppercase">Full-Screen Barcode & QR Scanner</h3>
                <p className="text-[10px] font-semibold text-navy-400">Position code inside target window</p>
              </div>
            </div>

            {/* Camera selector dropdown */}
            {devices.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-navy-400 whitespace-nowrap uppercase">Camera:</span>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="rounded-lg border border-navy-800 bg-navy-900 py-1.5 px-3 text-xs font-bold text-white focus:border-coral-500 focus:outline-none max-w-[150px] sm:max-w-[240px] truncate"
                >
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.label || `Camera ${devices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Upload QR image button */}
            <label className="flex items-center gap-1.5 rounded-lg bg-navy-800 border border-navy-700 hover:bg-navy-750 px-3 py-1.5 text-xs font-bold text-white cursor-pointer transition-colors shadow-sm">
              <Upload size={14} className="text-coral-400" />
              <span>Upload Image / QR</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            <button
              onClick={stopScanner}
              className="rounded-full p-2 text-navy-400 hover:bg-navy-900 hover:text-white transition-colors"
              title="Close Scanner"
            >
              <X size={20} />
            </button>
          </div>

          {/* Viewfinder area */}
          <div className="relative flex-1 w-full flex items-center justify-center bg-black overflow-hidden">
            {cameraError ? (
              <div className="p-6 text-center text-rose-500 flex flex-col items-center gap-3 max-w-sm">
                <div className="rounded-full bg-rose-500/10 p-4">
                  <AlertCircle size={36} />
                </div>
                <p className="text-sm font-semibold leading-relaxed">{cameraError}</p>
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={restartWebcam}
                    className="rounded-lg bg-coral-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-coral-600 transition-colors"
                  >
                    Retry Webcam
                  </button>
                  <button
                    onClick={stopScanner}
                    className="rounded-lg bg-navy-850 px-5 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors border border-navy-800"
                  >
                    Close Scanner
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Viewfinder target box */}
                <div className="absolute border-2 border-dashed border-coral-500/75 w-[280px] h-[160px] sm:w-[450px] sm:h-[220px] rounded-2xl pointer-events-none z-15 shadow-[0_0_0_9999px_rgba(10,15,30,0.75)] flex flex-col justify-between p-4">
                  {/* Corner brackets */}
                  <div className="absolute -top-1.5 -left-1.5 w-8 h-8 border-t-4 border-l-4 border-coral-500 rounded-tl-lg"></div>
                  <div className="absolute -top-1.5 -right-1.5 w-8 h-8 border-t-4 border-r-4 border-coral-500 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1.5 -left-1.5 w-8 h-8 border-b-4 border-l-4 border-coral-500 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 border-b-4 border-r-4 border-coral-500 rounded-br-lg"></div>
                  
                  {/* Scanning Laser Line */}
                  <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-coral-400 to-transparent shadow-[0_0_12px_#f43f5e] animate-scan pointer-events-none"></div>
                </div>

                {/* Html5Qrcode video container */}
                <div id="reader" className="w-full h-full relative"></div>

                {/* Instructions */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-xs text-white/90 bg-slate-900/80 px-5 py-2.5 rounded-full border border-navy-750 backdrop-blur-md pointer-events-none z-10 max-w-[85vw] font-medium leading-none">
                  Align code inside the frame. Keep camera steady.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
