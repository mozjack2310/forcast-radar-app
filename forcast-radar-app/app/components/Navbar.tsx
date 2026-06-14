"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import UnitToggle from "./UnitToggle";

export default function Navbar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      {/* 1. The Main Top Navbar */}
      <nav className="w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300 sticky top-0 z-40 shadow-sm ">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left Side: Brand & Links */}
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              ForRad <span className="text-cyan-500">Dash</span>
            </h1>

            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Link
                href="/"
                className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
              >
                Live Radar
              </Link>
              <Link
                href="/archive"
                className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
              >
                S3 Archive
              </Link>
            </div>
          </div>

          {/* Right Side: Quick Controls */}
          <div className="flex items-center gap-4">
            {/* You can leave the ThemeToggle here for quick access, or move it entirely to the drawer! */}
            <ThemeToggle />

            {/* The Gear Icon trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open Preferences Menu"
              aria-expanded={isSettingsOpen}
              aria-controls="preferences-drawer"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors border border-transparent dark:border-slate-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 2. The Dark Overlay Background */}
      {/* This renders only when the menu is open, clicking it closes the menu */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* 3. The Slide-Out Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-slate-800 flex flex-col ${
          isSettingsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close Preferences Menu"
            aria-expanded={isSettingsOpen}
            aria-controls="preferences-drawer"
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors border border-transparent dark:border-slate-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 flex flex-col gap-8 flex-grow">
          {/* Settings Group 1 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>

          {/* Settings Group 2 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Metrics
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                Units
              </span>
              {/* <UnitToggle /> Drop your IMP/MET toggle here! */}
              <div className="text-xs text-gray-500 italic">
                <UnitToggle />
              </div>
            </div>
          </div>

          {/* Settings Group 3 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Map Engine
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                Base Layer
              </span>
              <select className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block p-2">
                <option>Esri Canvas</option>
                <option>CartoDB Dark</option>
                <option>OpenStreetMap</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
