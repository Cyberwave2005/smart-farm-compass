import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Leaf, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { useFarmData } from "@/context/farm-data-context";
import { murimiChat } from "@/lib/murimi-ai-fns";
import { buildMurimiWelcomeMessage } from "@/lib/murimi-farm-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

export type ChatMessage = { role: Role; content: string };

function stripDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

async function compressDataUrl(dataUrl: string, maxWidth = 960, quality = 0.82): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image_load"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

type MurimiAiToolbarButtonProps = {
  className?: string;
};

export function MurimiAiToolbarButton({ className }: MurimiAiToolbarButtonProps) {
  const { session } = useAuth();
  const { snapshot } = useFarmData();
  const welcomeMessage = buildMurimiWelcomeMessage(snapshot);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMurimi = useServerFn(murimiChat);

  useEffect(() => {
    if (!open) return;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== "assistant") return prev;
      return [{ role: "assistant", content: welcomeMessage }];
    });
  }, [open, welcomeMessage]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        toast.error("Could not open camera. Check permissions or use “Upload leaf photo”.");
        setCameraOpen(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOpen, open]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      toast.error("Camera is not ready yet.");
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const raw = canvas.toDataURL("image/jpeg", 0.88);
    try {
      const compressed = await compressDataUrl(raw);
      setPendingImage(compressed);
      toast.success("Leaf snapshot attached — add a note and send.");
    } catch {
      setPendingImage(raw);
    }
    stopCamera();
  }, [stopCamera]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = async () => {
      const dataUrl = typeof r.result === "string" ? r.result : "";
      if (!dataUrl) return;
      try {
        setPendingImage(await compressDataUrl(dataUrl));
        toast.success("Photo attached.");
      } catch {
        setPendingImage(dataUrl);
      }
    };
    r.readAsDataURL(f);
  };

  const submit = async () => {
    const text = input.trim();
    if (!text && !pendingImage) {
      toast.message("Type a message or attach a leaf photo.");
      return;
    }
    const userText =
      text ||
      (pendingImage
        ? "Please analyse this crop leaf image for visible health, stress, or disease signs. Be careful not to claim a certain diagnosis from the photo alone."
        : "");

    const nextUser: ChatMessage = { role: "user", content: userText };
    const history = [...messages, nextUser];
    setMessages(history);
    setInput("");
    setSending(true);

    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    if (pendingImage) {
      const parsed = stripDataUrl(pendingImage);
      if (parsed) {
        imageBase64 = parsed.base64;
        imageMimeType = parsed.mime;
      }
      setPendingImage(null);
    }

    const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await sendMurimi({
        data: {
          messages: apiMessages,
          imageBase64,
          imageMimeType,
          accessToken: session?.access_token,
        },
      });
      const reply =
        typeof res.reply === "string"
          ? res.reply
          : "Murimi AI did not return text. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (res.mode === "error" && "detail" in res && typeof res.detail === "string") {
        console.warn(res.detail);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong sending your message. Check your connection and try again, murimi.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) stopCamera();
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn(
            "gap-2 shrink-0 bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-md hover:from-emerald-700 hover:to-green-800 border-0",
            className,
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">Talk to Murimi AI</span>
          <span className="sm:hidden font-medium">Murimi AI</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l p-0 sm:max-w-[440px] h-[100dvh] max-h-[100dvh]"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b bg-gradient-to-br from-emerald-600/12 via-background to-green-700/10 px-5 pb-4 pt-6 pr-12">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-display text-xl text-left">Murimi AI</SheetTitle>
                <SheetDescription className="text-left text-xs sm:text-sm leading-snug">
                  Your farming copilot — crops, water, sensors, and leaf photos. Advisory only; always
                  confirm with local extension when it matters.
                </SheetDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs h-8"
              onClick={() => {
                setMessages([{ role: "assistant", content: welcomeMessage }]);
                setInput("");
                setPendingImage(null);
                stopCamera();
              }}
            >
              New chat
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          <div className="flex flex-col gap-3 py-4 pr-2">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                    : "mr-auto border bg-card text-card-foreground rounded-bl-md",
                )}
              >
                {m.role === "assistant" ? (
                  <AssistantBody text={m.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            ))}
            {sending && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Murimi is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {cameraOpen && (
          <div className="shrink-0 border-t bg-muted/30 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Leaf camera</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={stopCamera}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <video ref={videoRef} playsInline muted className="w-full max-h-48 rounded-lg bg-black object-cover" />
            <div className="flex gap-2">
              <Button type="button" size="sm" className="flex-1" onClick={() => void captureFrame()}>
                Capture leaf
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {pendingImage && !cameraOpen && (
          <div className="shrink-0 border-t px-4 py-2 flex items-center gap-3 bg-muted/20">
            <img src={pendingImage} alt="Leaf preview" className="h-14 w-14 rounded-md object-cover border" />
            <div className="flex-1 min-w-0 text-xs text-muted-foreground">
              Photo attached — send with your question, or send as-is for a general leaf check.
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setPendingImage(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="shrink-0 border-t bg-background/95 p-3 space-y-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={sending || cameraOpen}
              onClick={() => {
                setCameraOpen(true);
              }}
            >
              <Camera className="h-3.5 w-3.5" />
              Camera
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={sending || cameraOpen}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Upload leaf
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void onFileChange(e)}
            />
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Ask about irrigation, maize stages, leaf spots, sensors…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              rows={2}
              className="min-h-[72px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={sending}
              onClick={() => void submit()}
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MessageCircle className="h-3 w-3 shrink-0" />
            Replies use your live dashboard data (plots, alerts, sensors) refreshed on each message.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Light formatting: **bold** segments only */
function AssistantBody({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = /^\*\*([^*]+)\*\*$/.exec(part);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
