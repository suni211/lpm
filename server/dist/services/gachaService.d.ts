export declare enum CardPackType {
    BASIC = "BASIC",
    PREMIUM = "PREMIUM",
    LEGEND = "LEGEND"
}
export declare const CARD_PACK_PRICES: {
    BASIC: number;
    PREMIUM: number;
    LEGEND: number;
};
interface GachaResult {
    card_type: 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT';
    card: any;
    is_duplicate: boolean;
    experience_gained?: number;
    user_card_id?: string;
}
/**
 * 카드 뽑기 메인 함수
 */
export declare function drawCard(userId: string, packType: CardPackType): Promise<GachaResult>;
export {};
//# sourceMappingURL=gachaService.d.ts.map