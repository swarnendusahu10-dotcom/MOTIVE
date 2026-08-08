"""
Similarity Agent tool. No model training — cosine similarity over embeddings
that were generated once (via /cases/embed) and stored on each Firestore
document. For a demo-scale collection (hundreds to a few thousand docs),
pulling all embeddings into Python and scoring them is fast enough; if this
ever needs to scale up, swap this for a proper vector index (e.g. the
Firestore vector search extension) without changing the tool's interface.
"""

from database.firestore_db import get_db, CASES_COLLECTION
from services.embedding_service import generate_embedding, cosine_similarity


def find_similar_cases(fir_id: str = "", description: str = "", top_k: int = 5) -> dict:
    """Find cases similar to a given case or description, using semantic similarity of the case narrative/MO.

    Args:
        fir_id: FIR ID of an existing case to find similar cases for. Use this when comparing
            against a specific known case. Leave empty if using `description` instead.
        description: Free-text description of a crime to compare against the case database —
            use this when there's no specific existing case to anchor on. Leave empty if using `fir_id`.
        top_k: Number of most similar cases to return. Default 5.
    """
    db = get_db()

    if fir_id:
        doc = db.collection(CASES_COLLECTION).document(fir_id).get()
        if not doc.exists:
            return {"error": f"No case found with id {fir_id}"}
        query_embedding = (doc.to_dict() or {}).get("embedding")
        exclude_id = fir_id
        if not query_embedding:
            return {"error": f"Case {fir_id} has no embedding yet — it may not have been processed by /cases/embed."}
    elif description:
        query_embedding = generate_embedding(description)
        exclude_id = None
        if not query_embedding:
            return {"error": "Could not generate an embedding for the given description."}
    else:
        return {"error": "Provide either fir_id or description."}

    scored = []
    for d in db.collection(CASES_COLLECTION).stream():
        if d.id == exclude_id:
            continue
        data = d.to_dict() or {}
        emb = data.get("embedding")
        if not emb:
            continue
        score = cosine_similarity(query_embedding, emb)
        data.pop("embedding", None)
        data["firId"] = d.id
        data["similarity"] = round(score, 4)
        scored.append(data)

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return {"results": scored[:top_k], "count": len(scored[:top_k])}
