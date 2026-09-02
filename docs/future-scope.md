# SmartRoad future scope

These are improvements the team considers worthwhile but did not build. None of them is claimed anywhere in the product. They are ordered roughly by value to a road authority that would run SmartRoad for real.

## 1. Data and machine learning

1. **Train on a real historical dataset.** The pipeline ships with a synthetic demo dataset. Replacing it with a licensed public dataset (for example the UK STATS19 collisions data, for which `ml/training/adapters/stats19.py` already maps the columns) or, better, with local records from a road authority would turn the risk estimator from a demonstration into a study. The dataset card in `data/README.md` lists what must be documented before that happens.
2. **Retrain on SmartRoad's own verified incidents** once there are thousands of them. The prepared-CSV schema was designed so an export of the `incidents` collection can feed the same pipeline.
3. **Collect the context features the model wants.** Weather, road type, speed limit and lighting are currently assumed for stored incidents. A weather service lookup at report time and a road-attribute lookup from OpenStreetMap data would replace the assumptions with measurements.
4. **Stronger models and explanations.** Gradient boosting (XGBoost or LightGBM), probability calibration, and SHAP values instead of the baseline-substitution sensitivity used now.
5. **Time-aware hotspots.** Run DBSCAN per period to show emerging and fading clusters, or ST-DBSCAN for space-time clusters, and weight clusters by severity.
6. **Photo analysis.** A convolutional network could classify uploaded photos (pothole versus not) to help verification. Photos are currently stored for human review only.

## 2. Product features

7. **Notifications.** Email or SMS when a report changes status; requires a provider account and credentials.
8. **Work assignment.** Assign verified incidents to field crews, record work orders and completion photos, integrate with a municipal ticketing system.
9. **Public commenting and confirmation.** Let other citizens confirm ("I saw this too") to strengthen verification without an admin visit.
10. **Forward geocoding and address search** on the report form; the map click covers the requirement today.
11. **Multi-city tenancy** with per-city administrators, map defaults and seed sets.
12. **Native mobile app** or a progressive web app with offline drafts and background upload.

## 3. Platform and operations

13. **Cloud object storage for images** (the storage adapter exists; a cloud implementation does not), with server-side re-encoding to strip EXIF metadata such as GPS tags.
14. **HttpOnly cookie sessions with CSRF protection** instead of a JWT in `localStorage`, plus refresh tokens and server-side revocation.
15. **Audit log collection** for administrative actions beyond the incident history (user changes, deletions, risk refreshes).
16. **Two-factor authentication and password recovery by email.**
17. **Observability:** structured JSON logs with request ids, metrics, and alerting on health-check failures.
18. **Continuous integration** running the backend, frontend, ML and end-to-end suites on every pull request, with the banned-phrase check as a gate.
19. **Load testing** against the documented performance targets with the `seed:load` generator.

## 4. Research directions

20. Compare DBSCAN with HDBSCAN and kernel density estimation for hotspot detection on real data, using the k-distance heuristic to justify `eps` per city.
21. Study whether citizen-reported severity agrees with administrator priority over time, and whether model risk levels correlate with resolution effort.
22. Fairness and coverage analysis: reports cluster where smartphone use is high; an authority should combine SmartRoad with inspections so under-reported areas are not neglected.
