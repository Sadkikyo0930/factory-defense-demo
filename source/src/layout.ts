export type Point = {x:number;y:number;station?:string};
export const processRoutes = {
 BD:['FA','祛除','贴胶','BD','UV','PI','VI','OUT'],
 POL:['FA','撕 POL','贴 POL','脱泡','条件切割（规则待补）','条件黑胶（规则待补）','PI','VI','OUT'],
 FILM:['FA','修膜','PI','VI','OUT'],
 REVIEW:['FA','过判','VI','OUT']
};
// Only FILM is executable; missing process/qualification rules are explicit gates.
export const filmRoute:Point[]=[{x:90,y:340},{x:220,y:340},{x:220,y:450},{x:480,y:450,station:'FILM'},{x:690,y:450},{x:690,y:350},{x:840,y:350,station:'PI'},{x:1060,y:350,station:'VI'},{x:1190,y:350}];
export const assetSpec={worker:{width:60,height:96,origin:'feet',frames:['idle','walk','work']},equipment:{width:140,height:140,view:'orthographic-front'},floor:{view:'orthographic-top',clean:true}};
