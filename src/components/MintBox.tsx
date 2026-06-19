"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getCountFromServer, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import "./MintBox.css";

const WL_SUPPLY = 1111;
const FREE_MINT_SUPPLY = 111;
const TOTAL_SUPPLY = 2222;
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


  return (
    <div className="win98-stack">
      {/* Single Window — everything inside */}
      <div className="win98-window win98-main">
        <div className="win98-body">
          {/* Title */}
          <h1 className="win98-header">MOSSADIO</h1>

          {/* Counts row under title — Free Mint, Whitelisted, Minted */}
          <div className="win98-section win98-count-row">
            <span className="win98-wl-count">
              {Math.min(minted, FREE_MINT_SUPPLY)}/{FREE_MINT_SUPPLY} Free Mint
            </span>
            <span className="win98-wl-count">
              {minted}/{WL_SUPPLY} Whitelisted
            </span>
            <span className="win98-wl-count">
              0/{TOTAL_SUPPLY} Minted
            </span>
          </div>

          {/* Two columns: preview left, registry right */}
          <div className="win98-columns">
            {/* Left: NFT Preview */}
            <div className="win98-col win98-col-left">
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

            {/* Right: WL Registry */}
            <div className="win98-col win98-col-right">
              <h2 className="win98-box-header">Join the Whitelist</h2>
              <p className="win98-wl-note">
                Be one of the first 111 on the whitelist and score a free mint alongside your WL spot!
              </p>
              <p className="win98-wl-note win98-wl-warn">
                We will review twitter accounts to prevent botting. Ty.&lt;3
              </p>
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
                  <span className="win98-label" style={{ color: "#ff6b6b", textAlign: "center", display: "block" }}>
                    {error}
                  </span>
                )}

                <button type="submit" className="win98-btn" disabled={submitting || submitted}>
                  {submitted ? "Submitted ✓" : submitting ? "Submitting..." : "Submit"}
                </button>
              </form>

              {/* Song — right below WL form */}
              <div className="win98-player-wrap">
                <audio
                  src="/audio/hava-nagila.mp3"
                  controls
                  className="win98-native-audio"
                />
              </div>
            </div>
          </div>

          {/* Details bottom centered */}
          <div className="win98-section win98-about-wrap">
            <h2 className="win98-box-header">Details</h2>
            <p className="win98-about-text">
              Supply: 2,222<br />
              Chain: Solana<br />
              Price: TBA<br />
              Date: TBA
            </p>

            {/* Social buttons */}
            <div className="win98-socials">
              <a
                href="https://launchmynft.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="win98-btn win98-social-btn"
                aria-label="LaunchMyNFT"
              >
                <img src="/images/launchmynft.png" alt="" className="win98-social-img" />
              </a>
              <a
                href="https://x.com/mossadio"
                target="_blank"
                rel="noopener noreferrer"
                className="win98-btn win98-social-btn"
                aria-label="X (Twitter)"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.829l4.713 6.231 5.448-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              </a>
              <button
                type="button"
                className="win98-btn win98-social-btn"
                aria-label="Telegram"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
                </svg>
              </button>
              <a
                href="https://www.instagram.com/mossadio.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="win98-btn win98-social-btn"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                </svg>
              </a>
            </div>
            <p className="win98-social-note">
              Help us work for ur Shekels by following us on twitter!&lt;3
            </p>
            <p className="win98-disclaimer">
              The team will remain anonymous for obvious reasons (the whole Jew thing).
              This is a degen mint with no promises, roadmap, or whitepaper - solely
              for meme and art purposes. Always use a burner wallet. Twitter names from the
              WL are only for verification and to prevent botting during mint; addresses and
              Twitter names will never be made public.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
