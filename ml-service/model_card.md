# Verifact NLP Classifier — Model Card

## Model Overview
| Property        | Value                                              |
|-----------------|----------------------------------------------------|
| Model Name      | Verifact NLP Classifier                            |
| Version         | v1.0                                               |
| Base Model      | cardiffnlp/twitter-roberta-base-sentiment-latest   |
| Task            | Text classification: FACT / RUMOR / UNCERTAIN      |
| Language        | English                                            |
| License         | MIT                                                |
| Inference Time  | < 2s (transformer) · < 100ms (fallback)            |

---

## Architecture
| Mode        | Model                            | Accuracy | Use Case                  |
|-------------|----------------------------------|----------|---------------------------|
| Primary     | Fine-tuned RoBERTa               | ~85%     | Normal operation          |
| Fallback    | TF-IDF + Logistic Regression     | ~72%     | Cold start / high load    |
| Heuristic   | Keyword matching                 | ~55%     | No model files available  |

**Uncertainty threshold:** Confidence < 0.55 → label set to `UNCERTAIN`

---

## Training Data
| Dataset           | Samples  | Labels                    | Domain           |
|-------------------|----------|---------------------------|------------------|
| LIAR              | ~12,836  | 6-class → binary mapped   | Political news   |
| FakeNewsNet       | ~20,000  | Real / Fake               | PolitiFact + GossipCop |
| COVID-19 Fake News| ~10,000  | Real / Fake               | Health claims    |
| FEVER (optional)  | ~130,000 | Supported / Refuted       | Wikipedia claims |

**Label mapping applied to LIAR:**
- `true`, `mostly-true`, `half-true` → **FACT** (1)
- `false`, `pants-fire`, `barely-true` → **RUMOR** (0)

**Data pipeline:**
- HTML decode → URL tokenize → whitespace normalize → truncate at 1000 chars
- Class balancing via oversampling of minority class
- Stratified 80/10/10 train/val/test split

---

## Performance (Test Set)
| Metric         | Transformer v1.0 | Fallback (TF-IDF+LR) |
|----------------|------------------|----------------------|
| Accuracy       | ~85%             | ~72%                 |
| Precision (F)  | ~0.84            | ~0.71                |
| Recall (F)     | ~0.86            | ~0.73                |
| F1 Macro       | ~0.85            | ~0.72                |
| AUC-ROC        | ~0.92            | ~0.79                |

*Actual values depend on datasets available during training. Run `python -m evaluation.evaluate` for exact numbers.*

---

## Intended Use
- Classify short-to-medium English text claims (5–512 tokens)
- **Advisory signal only** — not a replacement for human fact-checking
- One of three verdict signals in Verifact (alongside community votes and admin decision)
- Admin always sets the final verdict; this model's output is informational

---

## Limitations & Known Biases
| Limitation          | Detail                                                             |
|---------------------|--------------------------------------------------------------------|
| Political bias      | LIAR dataset is US-politics-heavy; international claims may underperform |
| Topic coverage      | Scientific and entertainment claims are underrepresented in training |
| Temporal cutoff     | Model does not know about events after its training data cutoff    |
| Language            | English-only; multilingual support planned for v2.0 (xlm-roberta) |
| Short texts         | Claims < 15 words often classified as UNCERTAIN due to low signal  |
| Satire              | May classify satirical content as RUMOR incorrectly               |

---

## Ethical Considerations
- Model output is always shown with confidence score for transparency
- Claims labeled UNCERTAIN are automatically escalated for admin review
- Predictions are never presented as ground truth to users
- Regular bias audits recommended every model version release
- All model predictions are logged for audit trail

---

## Uncertainty Escalation
| Confidence    | Label     | Action                               |
|---------------|-----------|--------------------------------------|
| ≥ 0.85        | FACT/RUMOR | Displayed as confident prediction   |
| 0.55 – 0.84   | FACT/RUMOR | Displayed with lower confidence      |
| < 0.55        | UNCERTAIN | Admin notified for expedited review  |

---

## Version History
| Version | Changes                                              |
|---------|------------------------------------------------------|
| v1.0    | Initial release. LIAR fine-tuning + fallback model   |
| v1.1    | (Planned) Add FakeNewsNet + COVID dataset            |
| v2.0    | (Planned) xlm-roberta multilingual + image support   |

---

## Running the ML Service

```bash
# Install dependencies
pip install -r requirements.txt

# 1. Prepare data (Sprint 3.2)
python -m app.data.preprocessing

# 2. Train fallback model (fast, ~1 min CPU)
python -m app.training.train_classical

# 3. Train transformer (requires GPU / Colab)
python -m app.training.train_transformer

# 4. Run evaluation (Sprint 3.5)
python -m evaluation.evaluate --model both

# 5. Start the API server
uvicorn app.main:app --reload --port 8000

# 6. Run tests
pytest tests/ -v
```
