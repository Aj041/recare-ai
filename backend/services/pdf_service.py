"""Utilities for extracting text from uploaded PDF documents."""

import pymupdf


class PDFExtractionError(Exception):
    """Raised when text cannot be extracted from an uploaded PDF."""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from every page of a PDF held in memory.

    Page text is separated by blank lines so the original page boundaries
    remain apparent. The uploaded bytes are only used in memory.
    """
    if not pdf_bytes:
        raise PDFExtractionError("The uploaded PDF is empty.")
    if not isinstance(pdf_bytes, bytes):
        raise PDFExtractionError("PDF input must be provided as bytes.")

    document = None
    try:
        document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        if document.needs_pass:
            raise PDFExtractionError(
                "This PDF is password-protected and cannot be processed."
            )

        page_text = [page.get_text() for page in document]
        extracted_text = "\n\n".join(page_text).strip()
        if not extracted_text:
            raise PDFExtractionError(
                "No extractable text was found in this PDF. It may be a scanned "
                "document; OCR is not implemented."
            )
        return extracted_text
    except PDFExtractionError:
        raise
    except Exception as exc:
        raise PDFExtractionError(
            "The uploaded file is not a valid PDF or is corrupted."
        ) from exc
    finally:
        if document is not None:
            document.close()
