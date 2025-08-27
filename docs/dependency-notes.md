# Dependency audit

The following dependencies were evaluated and removed from `requirements.txt`
because no references were found in the codebase:

- **Pillow** – no imports of `PIL` detected.
- **feedparser** – no usage of the `feedparser` library.
- **aiohttp** – no asynchronous HTTP client usage detected.
- **pdfminer.six** – PDF processing is handled with `pdfplumber` instead.
- **SQLAlchemy** – no database ORM code present.
- **PySide6** – no Qt GUI components used.
- **ollama** – the application uses the `ollama` CLI from Rust/TypeScript;
  the Python package is not required.

These packages have been removed from `requirements.txt` and `pyproject.toml`.
