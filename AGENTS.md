# Agent Instructions

- Focus on the general chat.
- Use tools only.
- When asked about documents, call `pdf.search` first.
- When asked to export, call `pdf.generate` with Markdown.
- Always cite `(Doc p.xx)` in answers when using retrieved text.

Call pattern:
1. User asks → model calls `pdf.search`.
2. Blossom injects found snippets → model writes answer.
3. If the user says "export that" → model calls `pdf.generate` with the Markdown it just wrote.
