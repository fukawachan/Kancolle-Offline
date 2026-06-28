import { describe, expect, it } from "vitest";
import { parseRecipes } from "../scripts/generate-improvement-data.mjs";

const FIXTURE = `
<html><body><span class="body body-2 body-all">
<span class="improvement improvement-details"><span><span><em>必要资源</em><i class="fuel">10</i><i class="ammo">20</i><i class="steel">40</i><i class="bauxite">0</i></span><span><em>★+0 ~ +6</em><i class="dev_mat">2<i>(2)</i></i><i class="imp_mat">1<i>(2)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-1" href="/equipments/1/">12cm单装炮<i>x1</i></a></span></span></span><span><em>★+6 ~ MAX</em><i class="dev_mat">2<i>(3)</i></i><i class="imp_mat">1<i>(2)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-1" href="/equipments/1/">12cm单装炮<i>x2</i></a></span></span></span><span><em>升级</em><i class="dev_mat">2<i>(4)</i></i><i class="imp_mat">2<i>(6)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-11" href="/equipments/28/">22号对水上电探<i>x1</i></a></span></span></span></span><strong><a class="equiptypeicon mod-left mod-1" href="/equipments/1/">12cm单装炮</a><b></b><a class="equiptypeicon mod-left mod-1" href="/equipments/293/">12cm单装炮改二</a></strong><font><b><i class="on">日</i><i class="on">一</i><i class="on">二</i><i class="on">三</i><i class="on">四</i><i class="on">五</i><i class="on">六</i><a href="/ships/1/">睦月</a> / <a href="/ships/254/">睦月改</a></b></font></span>
<span class="improvement improvement-details"><span><span><em>必要资源</em><i class="fuel">10</i><i class="ammo">40</i><i class="steel">70</i><i class="bauxite">10</i></span><span><em>★+0 ~ +6</em><i class="dev_mat">2<i>(3)</i></i><i class="imp_mat">2<i>(2)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-1" href="/equipments/297/">12.7cm连装炮A型<i>x2</i></a></span></span></span><span><em>★+6 ~ MAX</em><i class="dev_mat">3<i>(4)</i></i><i class="imp_mat">3<i>(5)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-1" href="/equipments/3/">10cm连装高角炮<i>x2</i></a></span></span></span><span><em>升级</em><i class="dev_mat">9<i>(17)</i></i><i class="imp_mat">6<i>(8)</i></i><span class="items"><span class="item"><a class="equiptypeicon mod-left mod-1" href="/equipments/294/">12.7cm连装炮A型改二<i>x1</i></a></span><span class="item"><i class="consumable">新型舰炮兵装资材<i>x1</i></i></span></span></span></span><strong><a class="equiptypeicon mod-left mod-1" href="/equipments/294/">12.7cm连装炮A型改二</a><b></b><a class="equiptypeicon mod-left mod-1" href="/equipments/455/">12.7cm连装炮A型改三改</a><i>+1</i></strong><font><b><i class="on">日</i><i>一</i><i>二</i><i>三</i><i>四</i><i>五</i><i class="on">六</i><a href="/ships/647/">浦波改二</a></b></font></span>
</span></body></html>
`;

describe("equipment improvement data generation", () => {
  it("parses fixed WhoCallsTheFleet fixture rows for costs, conversion, and secretary days", () => {
    const recipes = parseRecipes(FIXTURE);

    expect(recipes).toHaveLength(2);
    expect(recipes[0]).toMatchObject({
      sourceMasterId: 1,
      resultMasterId: 293,
      resources: { fuel: 10, ammo: 20, steel: 40, bauxite: 0 },
      stages: {
        low: { devmat: [2, 2], screw: [1, 2], slotItems: [{ masterId: 1, count: 1 }] },
        high: { devmat: [2, 3], screw: [1, 2], slotItems: [{ masterId: 1, count: 2 }] },
        convert: { devmat: [2, 4], screw: [2, 6], slotItems: [{ masterId: 28, count: 1 }] }
      },
      secretaries: [{ days: [0, 1, 2, 3, 4, 5, 6], shipMasterIds: [1, 254] }]
    });
    expect(recipes[1]).toMatchObject({
      sourceMasterId: 294,
      resultMasterId: 455,
      resultInitialLevel: 1,
      stages: {
        convert: {
          slotItems: [{ masterId: 294, count: 1 }],
          useItems: [{ id: 75, count: 1 }]
        }
      },
      secretaries: [{ days: [0, 6], shipMasterIds: [647] }]
    });
  });
});
