import CloudBackground from "@/components/CloudBackground";
import MintBox from "@/components/MintBox";

export default function Home() {
  return (
    <>
      <CloudBackground />
      <div className="star-backdrop" aria-hidden="true">
        <img src="/images/star-of-david.png" alt="" className="star-spin" />
      </div>
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <MintBox />
      </main>
    </>
  );
}
