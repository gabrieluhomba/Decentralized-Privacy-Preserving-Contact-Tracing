import { describe, it, expect, beforeEach } from "vitest";
import { ClarityValue, stringAsciiCV, uintCV, buffCV, optionalCV } from "@stacks/transactions";

const ERR_INVALID_PROOF = 100;
const ERR_INVALID_COMMITMENT = 101;
const ERR_INVALID_CHALLENGE = 102;
const ERR_INVALID_RESPONSE = 103;
const ERR_INVALID_VERIFIER_KEY = 104;
const ERR_INVALID_PROOF_TYPE = 105;
const ERR_PROOF_ALREADY_EXISTS = 106;
const ERR_PROOF_NOT_FOUND = 107;
const ERR_INVALID_TIMESTAMP = 108;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_PROOF_PARAM = 110;
const ERR_INVALID_EC_POINT = 111;
const ERR_INVALID_SCALAR = 112;
const ERR_VERIFICATION_FAILED = 113;
const ERR_INVALID_PROOF_LENGTH = 114;
const ERR_INVALID_HASH = 115;
const ERR_INVALID_SIGNATURE = 116;
const ERR_INVALID_ENCOUNTER_HASH = 117;
const ERR_INVALID_INFECTION_PROOF = 118;
const ERR_INVALID_EXPOSURE_QUERY = 119;
const ERR_MAX_PROOFS_EXCEEDED = 120;
const ERR_INVALID_PROOF_STATUS = 121;
const ERR_INVALID_GENERATOR = 122;
const ERR_INVALID_BASE = 123;
const ERR_INVALID_ORDER = 124;
const ERR_INVALID_FIELD_ELEMENT = 125;

interface Proof {
  proofType: string;
  commitment: Uint8Array;
  challenge: Uint8Array;
  response: Uint8Array;
  timestamp: number;
  submitter: string;
  status: boolean;
  verifierKey: Uint8Array;
  encounterHash: Uint8Array | null;
  infectionProof: Uint8Array | null;
  exposureQuery: Uint8Array | null;
}

interface ProofUpdate {
  updateCommitment: Uint8Array;
  updateChallenge: Uint8Array;
  updateResponse: Uint8Array;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ProofVerifierMock {
  state: {
    nextProofId: number;
    maxProofs: number;
    verificationFee: number;
    authorityContract: string | null;
    curveGenerator: Uint8Array;
    curveBase: Uint8Array;
    curveOrder: Uint8Array;
    proofs: Map<number, Proof>;
    proofUpdates: Map<number, ProofUpdate>;
    proofsByCommitment: Map<string, number>;
  } = {
    nextProofId: 0,
    maxProofs: 10000,
    verificationFee: 100,
    authorityContract: null,
    curveGenerator: Uint8Array.from([2, 121, 190, 102, 126, 249, 220, 187, 172, 85, 160, 98, 149, 206, 135, 11, 7, 2, 155, 252, 219, 45, 206, 40, 217, 89, 242, 129, 91, 22, 248, 23, 152]),
    curveBase: Uint8Array.from([2, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 152, 132, 145, 74, 20, 64, 11]),
    curveOrder: Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 254, 186, 174, 220, 230, 175, 72, 160, 59, 191, 210, 94, 140, 208, 54, 65, 65]),
    proofs: new Map(),
    proofUpdates: new Map(),
    proofsByCommitment: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProofId: 0,
      maxProofs: 10000,
      verificationFee: 100,
      authorityContract: null,
      curveGenerator: Uint8Array.from([2, 121, 190, 102, 126, 249, 220, 187, 172, 85, 160, 98, 149, 206, 135, 11, 7, 2, 155, 252, 219, 45, 206, 40, 217, 89, 242, 129, 91, 22, 248, 23, 152]),
      curveBase: Uint8Array.from([2, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 170, 152, 132, 145, 74, 20, 64, 11]),
      curveOrder: Uint8Array.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 254, 186, 174, 220, 230, 175, 72, 160, 59, 191, 210, 94, 140, 208, 54, 65, 65]),
      proofs: new Map(),
      proofUpdates: new Map(),
      proofsByCommitment: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  commitmentKey(commitment: Uint8Array): string {
    return commitment.toString();
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMaxProofs(newMax: number): Result<boolean> {
    if (newMax <= 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.maxProofs = newMax;
    return { ok: true, value: true };
  }

  setVerificationFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.verificationFee = newFee;
    return { ok: true, value: true };
  }

  setCurveParams(gen: Uint8Array, base: Uint8Array, order: Uint8Array): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (gen.length !== 33) return { ok: false, value: false };
    if (base.length !== 33) return { ok: false, value: false };
    if (order.length !== 32) return { ok: false, value: false };
    this.state.curveGenerator = gen;
    this.state.curveBase = base;
    this.state.curveOrder = order;
    return { ok: true, value: true };
  }

  submitProof(
    ptype: string,
    commitment: Uint8Array,
    challenge: Uint8Array,
    response: Uint8Array,
    verifierKey: Uint8Array,
    encounterHash: Uint8Array | null,
    infectionProof: Uint8Array | null,
    exposureQuery: Uint8Array | null
  ): Result<number> {
    if (this.state.nextProofId >= this.state.maxProofs) return { ok: false, value: ERR_MAX_PROOFS_EXCEEDED };
    if (!["encounter", "infection", "exposure"].includes(ptype)) return { ok: false, value: ERR_INVALID_PROOF_TYPE };
    if (commitment.length !== 32) return { ok: false, value: ERR_INVALID_COMMITMENT };
    if (challenge.length !== 32) return { ok: false, value: ERR_INVALID_CHALLENGE };
    if (response.length !== 32) return { ok: false, value: ERR_INVALID_RESPONSE };
    if (verifierKey.length !== 33) return { ok: false, value: ERR_INVALID_VERIFIER_KEY };
    if (encounterHash && encounterHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (infectionProof && infectionProof.length !== 64) return { ok: false, value: ERR_INVALID_SIGNATURE };
    if (exposureQuery && exposureQuery.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (this.state.proofsByCommitment.has(this.commitmentKey(commitment))) return { ok: false, value: ERR_PROOF_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.verificationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextProofId;
    const proof: Proof = {
      proofType: ptype,
      commitment,
      challenge,
      response,
      timestamp: this.blockHeight,
      submitter: this.caller,
      status: false,
      verifierKey,
      encounterHash,
      infectionProof,
      exposureQuery,
    };
    this.state.proofs.set(id, proof);
    this.state.proofsByCommitment.set(this.commitmentKey(commitment), id);
    this.state.nextProofId++;
    return { ok: true, value: id };
  }

  getProof(id: number): Proof | null {
    return this.state.proofs.get(id) || null;
  }

  verifyProof(proofId: number): Result<boolean> {
    const proof = this.state.proofs.get(proofId);
    if (!proof) return { ok: false, value: false };
    if (proof.status) return { ok: false, value: false };
    const computedChallenge = new Uint8Array(32);
    if (!this.arrayEqual(computedChallenge, proof.challenge)) return { ok: false, value: false };
    const updated = { ...proof, status: true };
    this.state.proofs.set(proofId, updated);
    return { ok: true, value: true };
  }

  private arrayEqual(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  updateProof(id: number, updateCommitment: Uint8Array, updateChallenge: Uint8Array, updateResponse: Uint8Array): Result<boolean> {
    const proof = this.state.proofs.get(id);
    if (!proof) return { ok: false, value: false };
    if (proof.submitter !== this.caller) return { ok: false, value: false };
    if (updateCommitment.length !== 32) return { ok: false, value: false };
    if (updateChallenge.length !== 32) return { ok: false, value: false };
    if (updateResponse.length !== 32) return { ok: false, value: false };
    const newKey = this.commitmentKey(updateCommitment);
    if (this.state.proofsByCommitment.has(newKey) && this.state.proofsByCommitment.get(newKey) !== id) {
      return { ok: false, value: false };
    }

    const updated: Proof = {
      ...proof,
      commitment: updateCommitment,
      challenge: updateChallenge,
      response: updateResponse,
      timestamp: this.blockHeight,
    };
    this.state.proofs.set(id, updated);
    this.state.proofsByCommitment.delete(this.commitmentKey(proof.commitment));
    this.state.proofsByCommitment.set(newKey, id);
    this.state.proofUpdates.set(id, {
      updateCommitment,
      updateChallenge,
      updateResponse,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getProofCount(): Result<number> {
    return { ok: true, value: this.state.nextProofId };
  }

  checkProofExistence(commitment: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.proofsByCommitment.has(this.commitmentKey(commitment)) };
  }
}

describe("ProofVerifier", () => {
  let contract: ProofVerifierMock;

  beforeEach(() => {
    contract = new ProofVerifierMock();
    contract.reset();
  });

  it("submits a proof successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    const result = contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const proof = contract.getProof(0);
    expect(proof?.proofType).toBe("encounter");
    expect(proof?.commitment).toEqual(commitment);
    expect(proof?.challenge).toEqual(challenge);
    expect(proof?.response).toEqual(response);
    expect(proof?.verifierKey).toEqual(verifierKey);
    expect(proof?.status).toBe(false);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate proof commitments", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    const result = contract.submitProof(
      "infection",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROOF_ALREADY_EXISTS);
  });

  it("rejects submission without authority contract", () => {
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    const result = contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid proof type", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    const result = contract.submitProof(
      "invalid",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROOF_TYPE);
  });

  it("rejects invalid commitment length", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(31).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    const result = contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_COMMITMENT);
  });

  it("verifies a proof successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(0);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    const result = contract.verifyProof(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const proof = contract.getProof(0);
    expect(proof?.status).toBe(true);
  });

  it("rejects verification for non-existent proof", () => {
    const result = contract.verifyProof(99);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects verification for already verified proof", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(0);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    contract.verifyProof(0);
    const result = contract.verifyProof(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("updates a proof successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    const updateCommitment = new Uint8Array(32).fill(5);
    const updateChallenge = new Uint8Array(32).fill(6);
    const updateResponse = new Uint8Array(32).fill(7);
    const result = contract.updateProof(0, updateCommitment, updateChallenge, updateResponse);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const proof = contract.getProof(0);
    expect(proof?.commitment).toEqual(updateCommitment);
    expect(proof?.challenge).toEqual(updateChallenge);
    expect(proof?.response).toEqual(updateResponse);
    const update = contract.state.proofUpdates.get(0);
    expect(update?.updateCommitment).toEqual(updateCommitment);
    expect(update?.updateChallenge).toEqual(updateChallenge);
    expect(update?.updateResponse).toEqual(updateResponse);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent proof", () => {
    const updateCommitment = new Uint8Array(32).fill(5);
    const updateChallenge = new Uint8Array(32).fill(6);
    const updateResponse = new Uint8Array(32).fill(7);
    const result = contract.updateProof(99, updateCommitment, updateChallenge, updateResponse);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-submitter", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    contract.caller = "ST3FAKE";
    const updateCommitment = new Uint8Array(32).fill(5);
    const updateChallenge = new Uint8Array(32).fill(6);
    const updateResponse = new Uint8Array(32).fill(7);
    const result = contract.updateProof(0, updateCommitment, updateChallenge, updateResponse);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets verification fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setVerificationFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.verificationFee).toBe(200);
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects verification fee change without authority", () => {
    const result = contract.setVerificationFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct proof count", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment1 = new Uint8Array(32).fill(1);
    const challenge1 = new Uint8Array(32).fill(2);
    const response1 = new Uint8Array(32).fill(3);
    const verifierKey1 = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment1,
      challenge1,
      response1,
      verifierKey1,
      null,
      null,
      null
    );
    const commitment2 = new Uint8Array(32).fill(5);
    const challenge2 = new Uint8Array(32).fill(6);
    const response2 = new Uint8Array(32).fill(7);
    const verifierKey2 = new Uint8Array(33).fill(8);
    contract.submitProof(
      "infection",
      commitment2,
      challenge2,
      response2,
      verifierKey2,
      null,
      null,
      null
    );
    const result = contract.getProofCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks proof existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const commitment = new Uint8Array(32).fill(1);
    const challenge = new Uint8Array(32).fill(2);
    const response = new Uint8Array(32).fill(3);
    const verifierKey = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment,
      challenge,
      response,
      verifierKey,
      null,
      null,
      null
    );
    const result = contract.checkProofExistence(commitment);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const nonExistent = new Uint8Array(32).fill(0);
    const result2 = contract.checkProofExistence(nonExistent);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects proof submission with max proofs exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxProofs = 1;
    const commitment1 = new Uint8Array(32).fill(1);
    const challenge1 = new Uint8Array(32).fill(2);
    const response1 = new Uint8Array(32).fill(3);
    const verifierKey1 = new Uint8Array(33).fill(4);
    contract.submitProof(
      "encounter",
      commitment1,
      challenge1,
      response1,
      verifierKey1,
      null,
      null,
      null
    );
    const commitment2 = new Uint8Array(32).fill(5);
    const challenge2 = new Uint8Array(32).fill(6);
    const response2 = new Uint8Array(32).fill(7);
    const verifierKey2 = new Uint8Array(33).fill(8);
    const result = contract.submitProof(
      "infection",
      commitment2,
      challenge2,
      response2,
      verifierKey2,
      null,
      null,
      null
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PROOFS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets curve params successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const gen = new Uint8Array(33).fill(1);
    const base = new Uint8Array(33).fill(2);
    const order = new Uint8Array(32).fill(3);
    const result = contract.setCurveParams(gen, base, order);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.curveGenerator).toEqual(gen);
    expect(contract.state.curveBase).toEqual(base);
    expect(contract.state.curveOrder).toEqual(order);
  });

  it("rejects curve params without authority", () => {
    const gen = new Uint8Array(33).fill(1);
    const base = new Uint8Array(33).fill(2);
    const order = new Uint8Array(32).fill(3);
    const result = contract.setCurveParams(gen, base, order);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});