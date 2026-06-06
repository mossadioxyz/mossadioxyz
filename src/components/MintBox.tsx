"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getCountFromServer, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import "./MintBox.css";

const TOTAL_SUPPLY = 2222;
const WL_SUPPLY = 1111;
const CYCLE_SPEED = 120; // ms between frames
const WL_COLLECTION = "whitelist";

export default function MintBox() {
  const [minted, setMinted] = useState(0);
  const [twitter, setTwitter] = useState("");
  const [solana, setSolana] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [totalMinted] = useState(0);
  const mintProgress = (totalMinted / TOTAL_SUPPLY) * 100;
  const wlProgress = (minted / WL_SUPPLY) * 100;

  // Fetch WL count from Firestore
  useEffect(() => {
    async function fetchCount() {
      try {
        const colRef = collection(db, WL_COLLECTION);
        const snapshot = await getCountFromServer(colRef);
        setMinted(snapshot.data().count);
      } catch {
        // Firebase not configured yet — leave at 0
      }
    }
    fetchCount();
  }, []);

  // Fetch image list from API
  useEffect(() => {
    fetch("/api/nft-images")
      .then((r) => r.json())
      .then((list: string[]) => {
        if (list.length > 0) setImages(list);
      })
      .catch(() => {});
  }, []);

  // Cycle through images like a GIF
  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % images.length);
    }, CYCLE_SPEED);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!twitter.trim() || !solana.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    if (minted >= WL_SUPPLY) {
      setError("Whitelist is full.");
      return;
    }

    setSubmitting(true);
    try {
      const colRef = collection(db, WL_COLLECTION);

      // Check for duplicate twitter
      const twitterQuery = query(colRef, where("twitter", "==", twitter.trim()));
      const twitterSnap = await getDocs(twitterQuery);
      if (!twitterSnap.empty) {
        setError("This Twitter handle is already registered.");
        setSubmitting(false);
        return;
      }

      // Check for duplicate wallet
      const solanaQuery = query(colRef, where("solana", "==", solana.trim()));
      const solanaSnap = await getDocs(solanaQuery);
      if (!solanaSnap.empty) {
        setError("This wallet address is already registered.");
        setSubmitting(false);
        return;
      }

      await addDoc(colRef, {
        twitter: twitter.trim(),
        solana: solana.trim(),
        timestamp: serverTimestamp(),
      });
      setMinted((prev) => prev + 1);
      setSubmitted(true);
      setTwitter("");
      setSolana("");
    } catch (err) {
      setError("Submission failed. Try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // MP3 Player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="win98-stack">
      {/* Main Window — no title bar */}
      <div className="win98-window">
        <div className="win98-body">
          {/* Big centered header */}
          <h1 className="win98-header">MOSSADIO</h1>

          {/* Total Minted Progress Bar */}
          <div className="win98-section">
            <span className="win98-label" style={{ textAlign: "center", display: "block" }}>
              {totalMinted}/{TOTAL_SUPPLY} Minted
            </span>
            <div className="win98-progress">
              <div
                className="win98-progress-fill"
                style={{ width: `${Math.max(mintProgress, 1)}%` }}
              />
            </div>
          </div>

          {/* NFT Preview */}
          <div className="win98-section" style={{ display: "flex", justifyContent: "center" }}>
            <div className="win98-image-well">
              {images.length > 0 ? (
                <img
                  src={images[frameIndex]}
                  alt="NFT Preview"
                  className="win98-nft-img"
                />
              ) : (
                <span style={{ color: "#808080", fontSize: "11px" }}>NFT Preview</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="win98-section win98-btn-row">
            <button className="win98-btn win98-btn-half">Join Whitelist</button>
            <button className="win98-btn win98-btn-half">Mint Now</button>
          </div>
        </div>
      </div>

      {/* MP3 Player */}
      <div className="win98-window win98-player">
        <div className="win98-body" style={{ padding: "12px 20px" }}>
          <audio
            ref={audioRef}
            src="/audio/Mossadio.mp3"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
          />
          <div className="win98-player-row">
            <button className="win98-btn win98-play-btn" onClick={togglePlay}>
              {playing ? "⏸" : "▶"}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="win98-seek"
            />
            <span className="win98-label" style={{ whiteSpace: "nowrap" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* WL Sign-up Window */}
      <div className="win98-window win98-wl-box">
        <div className="win98-body">
          <h2 className="win98-box-header">Join Whitelist</h2>

          {/* WL Progress Bar */}
          <div className="win98-section" style={{ marginBottom: "12px" }}>
            <span className="win98-label" style={{ textAlign: "center", display: "block" }}>
              {minted}/{WL_SUPPLY} Whitelist Spots
            </span>
            <div className="win98-progress">
              <div
                className="win98-progress-fill"
                style={{ width: `${Math.max(wlProgress, 1)}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="win98-form">
            <div className="win98-field">
              <label className="win98-label">Twitter:</label>
              <input
                type="text"
                placeholder="@handle"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="win98-input"
                disabled={submitting || submitted}
              />
            </div>

            <div className="win98-field">
              <label className="win98-label">Solana Address:</label>
              <input
                type="text"
                placeholder="Wallet address"
                value={solana}
                onChange={(e) => setSolana(e.target.value)}
                className="win98-input"
                disabled={submitting || submitted}
              />
            </div>

            {error && (
              <span className="win98-label" style={{ color: "red", textAlign: "center", display: "block" }}>
                {error}
              </span>
            )}

            <button type="submit" className="win98-btn" disabled={submitting || submitted}>
              {submitted ? "Submitted ✓" : submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>

      {/* About Window */}
      <div className="win98-window win98-wl-box">
        <div className="win98-body">
          <h2 className="win98-box-header">About</h2>
          <p className="win98-about-text">
            coming soon, sholom.
          </p>
        </div>
      </div>
    </div>
  );
}
