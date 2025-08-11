// src/vm/useAiJobs.ts
import { useState, useCallback } from "react";
import * as ai from "../services/aiJobsService";
import type { TreatmentSectionId } from "../services/aiJobsService";
import { proposeTurningPoints as svcProposeTP, type ProposeTPInput } from "../services/aiJobsService";

export function useAiJobs() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const proposeSynopsis = useCallback(async (screenplayId: number, input: ai.ProposeSynopsisInput) => {
        setLoading(true); setError(null);
        try { return await ai.proposeSynopsis(screenplayId, input); }
        catch (e: any) { setError(e?.message ?? "AI error"); throw e; }
        finally { setLoading(false); }
    }, []);

    const proposeTreatmentSection = useCallback(async (
        screenplayId: number,
        section: TreatmentSectionId,
        input: ai.ProposeTreatmentInput
    ) => {
        setLoading(true); setError(null);
        try { return await ai.proposeTreatmentSection(screenplayId, section, input); }
        catch (e: any) { setError(e?.message ?? "AI error"); throw e; }
        finally { setLoading(false); }
    }, []);

    const proposeTurningPoints = useCallback(async (screenplayId: number, input: ProposeTPInput) => {
        setLoading(true); setError(null);
        try { return await svcProposeTP(screenplayId, input); }
        catch (e: any) { setError(e?.message ?? "AI error"); throw e; }
        finally { setLoading(false); }
    }, []);

    return { loading, error, proposeSynopsis, proposeTreatmentSection, proposeTurningPoints };
}
