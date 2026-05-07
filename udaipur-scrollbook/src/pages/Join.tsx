import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { joinTrip as apiJoinTrip, ApiError } from "@/lib/api";
import { getToken, clearAuth } from "@/lib/auth";

export default function Join() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleJoin = async () => {
      const token = getToken();
      if (!token) {
        if (code) {
          localStorage.setItem("pendingJoinCode", code);
          toast({
            title: "Login Required",
            description: "Please login to join the trip.",
          });
        }
        navigate("/");
        return;
      }

      if (!code) {
        setError("Invalid invite link: No code provided.");
        setLoading(false);
        return;
      }

      try {
        await apiJoinTrip(code);
        toast({
          title: "Trip joined! 🎉",
          description: "You've been added to the trip. Redirecting...",
        });
        setTimeout(() => navigate("/"), 2000);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Token is invalid/expired. Clear it and redirect to login.
          clearAuth();
          if (code) {
            localStorage.setItem("pendingJoinCode", code);
          }
          toast({
            title: "Session Expired",
            description: "Please log in again to join the trip.",
          });
          navigate("/");
          return;
        }

        const msg = err instanceof ApiError ? err.message : "Failed to join trip.";
        setError(msg);
        setLoading(false);
      }
    };

    handleJoin();
  }, [code, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {loading ? (
          <>
            <div className="text-5xl mb-4">✈️</div>
            <h1 className="font-handwritten text-3xl mb-2">Joining trip...</h1>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", color: "#888" }}>
              Hold tight, we're adding you to the adventure.
            </p>
          </>
        ) : error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="font-handwritten text-2xl mb-3 text-destructive">Invalid Invite Link</h1>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: "#888", marginBottom: "20px" }}>
              {error}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 rounded-full bg-warm-orange text-white font-handwritten text-lg hover:opacity-90 transition"
            >
              Back Home
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
