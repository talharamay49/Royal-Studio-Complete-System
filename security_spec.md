# Royal Studio Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Shard Allowlist**: Only explicitly allowlisted shard IDs (`profile`, `users`, `clients`, `events`, `financials`, `operations`, `cms`, `sessions`, `backup`) may exist inside `/studio_store/{shardId}`.
2. **Schema & Size Enforcement**: Every `/studio_store/{shardId}` write must strictly match `StudioStoreShard` (`shardKey`, `payloadJson`, `updatedAtIso`, `version`), with `shardKey == shardId`, `payloadJson.size() <= 950000`, and `version >= 1`.
3. **Website Inquiry Validation**: Every `/website_inquiries/{inquiryId}` document must match `WebsiteInquiryRecord` with bounded strings (`brideName <= 120`, `phone <= 40`, `message <= 2000`) and immutable `referenceId == inquiryId`.
4. **Default Deny**: All other paths (`/{document=**}`) are strictly denied (`allow read, write: if false`).

## 2. The "Dirty Dozen" Payloads (Rejected by `firestore.rules`)
1. **Shadow Field Injection on `/studio_store/profile`**: `{ shardKey: "profile", payloadJson: "{}", updatedAtIso: "2026-10-03", version: 1, isAdmin: true }` -> Rejected by `hasOnly`.
2. **Shard ID Mismatch**: Writing `{ shardKey: "users", ... }` to `/studio_store/profile` -> Rejected by `data.shardKey == shardId`.
3. **Unallowlisted Shard Name**: Writing to `/studio_store/arbitrary_collection` -> Rejected by `isAllowedShardId(shardId)`.
4. **Denial-of-Wallet Oversized Payload**: `payloadJson` exceeding `950000` bytes -> Rejected by `data.payloadJson.size() <= 950000`.
5. **Invalid ID Poisoning**: Document ID with special characters or length > 128 -> Rejected by `isValidId()`.
6. **Type Confusion on `version`**: `{ shardKey: "profile", payloadJson: "{}", updatedAtIso: "2026-10-03", version: "one" }` -> Rejected by `data.version is number`.
7. **Missing Required Key on Inquiry**: `/website_inquiries/RS-INQ-123` missing `phone` -> Rejected by `hasAll`.
8. **Oversized Message on Inquiry**: `message` > 2000 chars -> Rejected by `data.message.size() <= 2000`.
9. **Reference ID Spoofing on Inquiry**: `referenceId != inquiryId` -> Rejected by `data.referenceId == inquiryId`.
10. **Unauthorized Delete on `/studio_store/{shardId}`**: `DELETE /studio_store/financials` -> Rejected by `allow delete: if false`.
11. **Unauthorized Update/Delete on `/website_inquiries/{inquiryId}`**: Attempting to overwrite or delete an existing inquiry record -> Rejected by `allow update, delete: if false`.
12. **Arbitrary Collection Write**: Writing to `/unprotected_collection/doc1` -> Rejected by global default-deny catch-all.
