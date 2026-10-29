export const PLAY_PACKAGE='global.medicea.app';
// IDs are an explicit allowlist; configure these exact IDs in the test catalogue.
export const PLAY_PLANS={
 pass7:{product:'medicea_pass_7',type:'inapp',days:7},
 pass14:{product:'medicea_pass_14',type:'inapp',days:14},
 pass30:{product:'medicea_pass_30',type:'inapp',days:30},
 monthly:{product:'medicea_personal',type:'subs',basePlan:'monthly'},
 annual:{product:'medicea_personal',type:'subs',basePlan:'annual'},
} as const;
export type PlayPlan=keyof typeof PLAY_PLANS;
