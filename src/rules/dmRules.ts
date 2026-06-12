import type { AutoReplyRule } from "./autoReply.js";

export const dmRules: {
  warningKeywords: string[];
  immediateBlockKeywords: string[];
  autoReplies: AutoReplyRule[];
} = {
  warningKeywords: [
    "stupid",
    "idiot",
    "hate",
    "shut up",
    "annoying",
    "I love you",
    "i will visit you",
    "mazuri",
    "nitumie",
    "niokolee",
  ],
  immediateBlockKeywords: [
    "fuck you",
    "kill you",
    "doxx",
    "nude",
    "explicit",
    "rape",
  ],
  autoReplies: [
    {
      type: "contains",
      pattern: "hello",
      reply: "Hello! How are you? You are talking to Ezra's agent bot.",
    },
    {
      type: "contains",
      pattern: "help",
      reply: "I’m here to help. Tell me what you need, and I’ll do my best.",
    },
    {
      type: "regex",
      pattern: "\\b(thanks|thank you|ty)\\b",
      reply: "You’re welcome! If you have any other questions, I’m happy to assist.",
    },
    {
      type: "contains",
      pattern: "quote",
      reply: "Here’s a positive thought for your day: keep going, you’re doing great!",
    },
  ],
};
