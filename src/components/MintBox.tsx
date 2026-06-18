"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getCountFromServer, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import "./MintBox.css";

const WL_SUPPLY = 1111;
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

          {/* Counts row under title — WL left, Minted right */}
          <div className="win98-section win98-count-row">
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
              <h2 className="win98-box-header">Join Whitelist</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
}
