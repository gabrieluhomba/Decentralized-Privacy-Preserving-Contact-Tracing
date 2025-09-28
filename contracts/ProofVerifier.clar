(define-constant ERR-INVALID-PROOF u100)
(define-constant ERR-INVALID-COMMITMENT u101)
(define-constant ERR-INVALID-CHALLENGE u102)
(define-constant ERR-INVALID-RESPONSE u103)
(define-constant ERR-INVALID-VERIFIER-KEY u104)
(define-constant ERR-INVALID-PROOF-TYPE u105)
(define-constant ERR-PROOF-ALREADY-EXISTS u106)
(define-constant ERR-PROOF-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-PROOF-PARAM u110)
(define-constant ERR-INVALID-EC-POINT u111)
(define-constant ERR-INVALID-SCALAR u112)
(define-constant ERR-VERIFICATION-FAILED u113)
(define-constant ERR-INVALID-PROOF-LENGTH u114)
(define-constant ERR-INVALID-HASH u115)
(define-constant ERR-INVALID-SIGNATURE u116)
(define-constant ERR-INVALID-ENCOUNTER-HASH u117)
(define-constant ERR-INVALID-INFECTION-PROOF u118)
(define-constant ERR-INVALID-EXPOSURE-QUERY u119)
(define-constant ERR-MAX-PROOFS-EXCEEDED u120)
(define-constant ERR-INVALID-PROOF-STATUS u121)
(define-constant ERR-INVALID-GENERATOR u122)
(define-constant ERR-INVALID-BASE u123)
(define-constant ERR-INVALID-ORDER u124)
(define-constant ERR-INVALID-FIELD-ELEMENT u125)

(define-data-var next-proof-id uint u0)
(define-data-var max-proofs uint u10000)
(define-data-var verification-fee uint u100)
(define-data-var authority-contract (optional principal) none)
(define-data-var curve-generator (buff 33) 0x0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798)
(define-data-var curve-base (buff 33) 0x02AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA984914A1440B)
(define-data-var curve-order (buff 32) 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141)

(define-map proofs
  uint
  {
    proof-type: (string-ascii 20),
    commitment: (buff 32),
    challenge: (buff 32),
    response: (buff 32),
    timestamp: uint,
    submitter: principal,
    status: bool,
    verifier-key: (buff 33),
    encounter-hash: (optional (buff 32)),
    infection-proof: (optional (buff 64)),
    exposure-query: (optional (buff 32))
  }
)

(define-map proofs-by-commitment
  (buff 32)
  uint)

(define-map proof-updates
  uint
  {
    update-commitment: (buff 32),
    update-challenge: (buff 32),
    update-response: (buff 32),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-proof (id uint))
  (map-get? proofs id)
)

(define-read-only (get-proof-updates (id uint))
  (map-get? proof-updates id)
)

(define-read-only (is-proof-registered (commitment (buff 32)))
  (is-some (map-get? proofs-by-commitment commitment))
)

(define-private (validate-proof-type (ptype (string-ascii 20)))
  (if (or (is-eq ptype "encounter") (is-eq ptype "infection") (is-eq ptype "exposure"))
      (ok true)
      (err ERR-INVALID-PROOF-TYPE))
)

(define-private (validate-commitment (comm (buff 32)))
  (if (is-eq (len comm) u32)
      (ok true)
      (err ERR-INVALID-COMMITMENT))
)

(define-private (validate-challenge (chal (buff 32)))
  (if (is-eq (len chal) u32)
      (ok true)
      (err ERR-INVALID-CHALLENGE))
)

(define-private (validate-response (resp (buff 32)))
  (if (is-eq (len resp) u32)
      (ok true)
      (err ERR-INVALID-RESPONSE))
)

(define-private (validate-verifier-key (key (buff 33)))
  (if (is-eq (len key) u33)
      (ok true)
      (err ERR-INVALID-VERIFIER-KEY))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-ec-point (point (buff 33)))
  (if (is-eq (len point) u33)
      (ok true)
      (err ERR-INVALID-EC-POINT))
)

(define-private (validate-scalar (scalar (buff 32)))
  (if (is-eq (len scalar) u32)
      (ok true)
      (err ERR-INVALID-SCALAR))
)

(define-private (validate-hash (h (buff 32)))
  (if (is-eq (len h) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-signature (sig (buff 65)))
  (if (is-eq (len sig) u65)
      (ok true)
      (err ERR-INVALID-SIGNATURE))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-AUTHORITY-NOT-VERIFIED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-proofs (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-PROOF-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-proofs new-max)
    (ok true)
  )
)

(define-public (set-verification-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-PROOF-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set verification-fee new-fee)
    (ok true)
  )
)

(define-public (set-curve-params (gen (buff 33)) (base (buff 33)) (order (buff 32)))
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (try! (validate-ec-point gen))
    (try! (validate-ec-point base))
    (try! (validate-scalar order))
    (var-set curve-generator gen)
    (var-set curve-base base)
    (var-set curve-order order)
    (ok true)
  )
)

(define-public (submit-proof
  (ptype (string-ascii 20))
  (commitment (buff 32))
  (challenge (buff 32))
  (response (buff 32))
  (verifier-key (buff 33))
  (encounter-hash (optional (buff 32)))
  (infection-proof (optional (buff 64)))
  (exposure-query (optional (buff 32)))
)
  (let (
        (next-id (var-get next-proof-id))
        (current-max (var-get max-proofs))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-PROOFS-EXCEEDED))
    (try! (validate-proof-type ptype))
    (try! (validate-commitment commitment))
    (try! (validate-challenge challenge))
    (try! (validate-response response))
    (try! (validate-verifier-key verifier-key))
    (match encounter-hash h (try! (validate-hash h)) true)
    (match infection-proof p (try! (validate-signature p)) true)
    (match exposure-query q (try! (validate-hash q)) true)
    (asserts! (is-none (map-get? proofs-by-commitment commitment)) (err ERR-PROOF-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get verification-fee) tx-sender authority-recipient))
    )
    (map-set proofs next-id
      {
        proof-type: ptype,
        commitment: commitment,
        challenge: challenge,
        response: response,
        timestamp: block-height,
        submitter: tx-sender,
        status: false,
        verifier-key: verifier-key,
        encounter-hash: encounter-hash,
        infection-proof: infection-proof,
        exposure-query: exposure-query
      }
    )
    (map-set proofs-by-commitment commitment next-id)
    (var-set next-proof-id (+ next-id u1))
    (print { event: "proof-submitted", id: next-id })
    (ok next-id)
  )
)

(define-public (verify-proof (proof-id uint))
  (let ((proof (map-get? proofs proof-id)))
    (match proof
      p
        (begin
          (asserts! (not (get status p)) (err ERR-INVALID-PROOF-STATUS))
          (let (
                (comm (get commitment p))
                (chal (get challenge p))
                (resp (get response p))
                (vkey (get verifier-key p))
                (computed-chal (sha256 (concat comm vkey)))
              )
            (asserts! (is-eq computed-chal chal) (err ERR-VERIFICATION-FAILED))
            (let ((sig-ok (secp256k1-verify comm resp vkey)))
              (asserts! sig-ok (err ERR-VERIFICATION-FAILED))
            )
            (map-set proofs proof-id (merge p { status: true }))
            (print { event: "proof-verified", id: proof-id })
            (ok true)
          )
        )
      (err ERR-PROOF-NOT-FOUND)
    )
  )
)

(define-public (update-proof
  (proof-id uint)
  (update-commitment (buff 32))
  (update-challenge (buff 32))
  (update-response (buff 32))
)
  (let ((proof (map-get? proofs proof-id)))
    (match proof
      p
        (begin
          (asserts! (is-eq (get submitter p) tx-sender) (err ERR-AUTHORITY-NOT-VERIFIED))
          (try! (validate-commitment update-commitment))
          (try! (validate-challenge update-challenge))
          (try! (validate-response update-response))
          (let ((existing (map-get? proofs-by-commitment update-commitment)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id proof-id) (err ERR-PROOF-ALREADY-EXISTS))
              true
            )
          )
          (let ((old-comm (get commitment p)))
            (if (is-eq old-comm update-commitment)
                (ok true)
                (begin
                  (map-delete proofs-by-commitment old-comm)
                  (map-set proofs-by-commitment update-commitment proof-id)
                  (ok true)
                )
            )
          )
          (map-set proofs proof-id
            (merge p {
              commitment: update-commitment,
              challenge: update-challenge,
              response: update-response,
              timestamp: block-height
            })
          )
          (map-set proof-updates proof-id
            {
              update-commitment: update-commitment,
              update-challenge: update-challenge,
              update-response: update-response,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "proof-updated", id: proof-id })
          (ok true)
        )
      (err ERR-PROOF-NOT-FOUND)
    )
  )
)

(define-public (get-proof-count)
  (ok (var-get next-proof-id))
)

(define-public (check-proof-existence (commitment (buff 32)))
  (ok (is-proof-registered commitment))
)