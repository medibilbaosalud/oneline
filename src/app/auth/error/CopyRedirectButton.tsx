"use client";

type CopyRedirectButtonProps = {
  redirectUri: string;
};

const CopyRedirectButton = ({ redirectUri }: CopyRedirectButtonProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
    } catch (error) {
      console.error("Failed to copy redirect_uri", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
    >
      Copy redirect_uri
    </button>
  );
};

export default CopyRedirectButton;
