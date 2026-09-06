from pypdf import PdfReader
import io


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Read a PDF's raw bytes (in memory, no disk write) and return all
    its text, concatenated across pages."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages_text)