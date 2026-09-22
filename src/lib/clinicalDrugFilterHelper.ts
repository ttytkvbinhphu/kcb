import { Drug } from "../types";

export interface AgeFilterConfig {
  age?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  unit?: "years" | "months";
  preset?: string;
}

export interface WeightFilterConfig {
  weight: number | null;
  minWeight?: number | null;
  maxWeight?: number | null;
  preset?: string;
}

export interface RenalFilterConfig {
  egfr: number | null;
  minCrcl?: number | null;
  maxCrcl?: number | null;
  preset?: string;
}

/**
 * Chuyển đổi tuổi sang đơn vị năm (years)
 */
export const convertAgeToYears = (age: number | null, unit: "years" | "months"): number | null => {
  if (age === null || age === undefined || isNaN(age) || age < 0) return null;
  return unit === "months" ? age / 12 : age;
};

/**
 * Kiểm tra xem một thuốc có chống chỉ định với độ tuổi cụ thể không
 */
export const isDrugAgeContraindicated = (drug: Drug, ageInYears: number): boolean => {
  if (!drug.contraindications || !Array.isArray(drug.contraindications)) return false;

  for (const c of drug.contraindications) {
    if (!c) continue;

    // 1. Kiểm tra cấu hình số học (ageConfig)
    if (c.ageConfig && typeof c.ageConfig.value === "number") {
      const cfgUnit = c.ageConfig.unit || "years";
      const cfgValYears = cfgUnit === "months" ? c.ageConfig.value / 12 : c.ageConfig.value;
      const op = c.ageConfig.operator;

      if (op === "<" && ageInYears < cfgValYears) return true;
      if (op === "≤" && ageInYears <= cfgValYears) return true;
      if (op === ">" && ageInYears > cfgValYears) return true;
      if (op === "≥" && ageInYears >= cfgValYears) return true;

      // Khoảng chặn trước nếu có (operatorBefore)
      if (c.ageConfig.operatorBefore && typeof c.ageConfig.valueBefore === "number") {
        const cfgBeforeYears =
          cfgUnit === "months" ? c.ageConfig.valueBefore / 12 : c.ageConfig.valueBefore;
        const opBefore = c.ageConfig.operatorBefore;
        let matchBefore = false;
        if (opBefore === ">" && ageInYears > cfgBeforeYears) matchBefore = true;
        if (opBefore === "≥" && ageInYears >= cfgBeforeYears) matchBefore = true;
        if (opBefore === "<" && ageInYears < cfgBeforeYears) matchBefore = true;
        if (opBefore === "≤" && ageInYears <= cfgBeforeYears) matchBefore = true;

        if (matchBefore) return true;
      }
    }

    // 2. Kiểm tra văn bản chống chỉ định (heuristic parsing)
    const content = (c.content || "").toLowerCase();
    if (content.length > 2) {
      // Trẻ sơ sinh
      if (ageInYears <= 1 / 12 && (content.includes("trẻ sơ sinh") || content.includes("sơ sinh"))) {
        if (
          c.type === "Age" ||
          content.includes("chống chỉ định") ||
          content.includes("không dùng") ||
          content.includes("chống chỉ định:")
        ) {
          return true;
        }
      }

      // Người cao tuổi
      if (
        ageInYears >= 65 &&
        (content.includes("người cao tuổi") || content.includes("người già")) &&
        (c.type === "Age" || content.includes("chống chỉ định") || content.includes("không dùng"))
      ) {
        return true;
      }

      // Phát hiện dạng "dưới X tuổi" hoặc "< X tuổi"
      const ageUnderMatches = content.match(
        /(?:dưới|<|≤|không dùng cho trẻ\s*(?:dưới|<)?)\s*(\d+(?:\.\d+)?)\s*(tuổi|tháng)/g
      );
      if (ageUnderMatches) {
        for (const matchStr of ageUnderMatches) {
          const numMatch = matchStr.match(/(\d+(?:\.\d+)?)/);
          const isMonth = matchStr.includes("tháng");
          if (numMatch) {
            const limitNum = parseFloat(numMatch[1]);
            const limitYears = isMonth ? limitNum / 12 : limitNum;
            if (ageInYears < limitYears) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
};

/**
 * Kiểm tra xem một thuốc có phù hợp với độ tuổi bệnh nhân hay không
 * Hỗ trợ cả tuổi đơn lẻ (config.age) và khoảng tuổi [minAge, maxAge] (thanh trượt 2 dấu chấm)
 */
export const isDrugMatchingAge = (drug: Drug, config: AgeFilterConfig): boolean => {
  // 1. Nếu có khoảng tuổi minAge và maxAge từ thanh trượt
  if (config.minAge !== undefined && config.minAge !== null && config.maxAge !== undefined && config.maxAge !== null) {
    const minA = config.minAge;
    const maxA = config.maxAge;

    // Khoảng mặc định [0, 100] nghĩa là tất cả độ tuổi -> không lọc
    if (minA <= 0 && maxA >= 100 && (config.age === null || config.age === undefined)) {
      return true;
    }

    // Nếu khoảng co hẹp lại thành một điểm
    if (minA === maxA) {
      return isDrugMatchingAge(drug, { age: minA, unit: "years" });
    }

    // Kiểm tra chống chỉ định cho khoảng tuổi này
    // Nếu thuốc chống chỉ định cho trẻ em mà khoảng người dùng chọn nằm trong nhóm trẻ em
    if (maxA <= 12 && isDrugAgeContraindicated(drug, Math.max(0, (minA + maxA) / 2))) {
      return false;
    }
    if (isDrugAgeContraindicated(drug, minA) && isDrugAgeContraindicated(drug, maxA)) {
      return false;
    }
    // Chống chỉ định người cao tuổi
    if (minA >= 65 && isDrugAgeContraindicated(drug, 75)) {
      return false;
    }

    // Kiểm tra hướng dẫn phân liều (dosageAndAdministration)
    const dosages = drug.dosageAndAdministration;
    if (Array.isArray(dosages) && dosages.length > 0) {
      const itemsWithAge = dosages.filter(
        (d) =>
          (d.ageMin !== undefined && d.ageMin !== null) ||
          (d.ageMax !== undefined && d.ageMax !== null) ||
          (Array.isArray(d.patientGroups) && d.patientGroups.length > 0)
      );

      if (itemsWithAge.length > 0) {
        const hasMatchingDose = itemsWithAge.some((d) => {
          // Giao thoa khoảng tuổi [minA, maxA] và [d.ageMin, d.ageMax]
          const minOk = d.ageMax === undefined || d.ageMax === null || d.ageMax >= minA;
          const maxOk = d.ageMin === undefined || d.ageMin === null || d.ageMin <= maxA;
          if (minOk && maxOk) return true;

          // Kiểm tra qua patientGroups
          if (Array.isArray(d.patientGroups)) {
            if (minA < 18 && (d.patientGroups.includes("Trẻ em") || d.patientGroups.includes("Trẻ nhỏ"))) {
              return true;
            }
            if (maxA >= 65 && d.patientGroups.includes("Người cao tuổi")) {
              return true;
            }
            if (minA >= 18 && minA < 65 && d.patientGroups.includes("Người lớn")) {
              return true;
            }
          }
          return false;
        });

        if (!hasMatchingDose) {
          const hasGeneralDose = dosages.some(
            (d) =>
              d.ageMin === undefined &&
              d.ageMax === undefined &&
              (!d.patientGroups || d.patientGroups.length === 0)
          );
          // Nếu khoảng chỉ dành cho trẻ em nhưng thuốc chỉ có liều người lớn
          if (maxA < 12 && !hasMatchingDose) {
            return false;
          }
          if (!hasGeneralDose) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // 2. Lọc theo tuổi đơn lẻ (config.age)
  const ageInYears = convertAgeToYears(config.age ?? null, config.unit || "years");
  if (ageInYears === null) return true; // Không lọc tuổi

  // 1. Nếu bị chống chỉ định với độ tuổi này -> Loại bỏ ngay
  if (isDrugAgeContraindicated(drug, ageInYears)) {
    return false;
  }

  // 2. Kiểm tra hướng dẫn phân liều (dosageAndAdministration)
  const dosages = drug.dosageAndAdministration;
  if (Array.isArray(dosages) && dosages.length > 0) {
    const itemsWithAge = dosages.filter(
      (d) =>
        (d.ageMin !== undefined && d.ageMin !== null) ||
        (d.ageMax !== undefined && d.ageMax !== null) ||
        (Array.isArray(d.patientGroups) && d.patientGroups.length > 0)
    );

    // Nếu thuốc có khai báo cụ thể ngưỡng tuổi trong các mục liều
    if (itemsWithAge.length > 0) {
      const hasMatchingDose = itemsWithAge.some((d) => {
        // Kiểm tra ngưỡng ageMin / ageMax
        const minOk = d.ageMin === undefined || d.ageMin === null || ageInYears >= d.ageMin;
        const maxOk = d.ageMax === undefined || d.ageMax === null || ageInYears <= d.ageMax;
        if (minOk && maxOk) return true;

        // Kiểm tra qua patientGroups
        if (Array.isArray(d.patientGroups)) {
          if (ageInYears < 18 && (d.patientGroups.includes("Trẻ em") || d.patientGroups.includes("Trẻ nhỏ"))) {
            return true;
          }
          if (ageInYears >= 65 && d.patientGroups.includes("Người cao tuổi")) {
            return true;
          }
          if (ageInYears >= 18 && ageInYears < 65 && d.patientGroups.includes("Người lớn")) {
            return true;
          }
        }
        return false;
      });

      // Nếu có khai báo danh mục liều cho độ tuổi mà không mục nào bao gồm tuổi này
      if (!hasMatchingDose) {
        // Kiểm tra xem có mục liều chung (không ghi tuổi) không
        const hasGeneralDose = dosages.some(
          (d) =>
            d.ageMin === undefined &&
            d.ageMax === undefined &&
            (!d.patientGroups || d.patientGroups.length === 0)
        );
        // Nếu bệnh nhân là trẻ em (<12 tuổi) nhưng thuốc chỉ có liều người lớn -> Không phù hợp
        if (ageInYears < 12 && !hasMatchingDose) {
          return false;
        }
        if (!hasGeneralDose) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Kiểm tra xem một thuốc có chống chỉ định với cân nặng cụ thể không
 */
export const isDrugWeightContraindicated = (drug: Drug, weightKg: number): boolean => {
  if (!drug.contraindications || !Array.isArray(drug.contraindications)) return false;

  for (const c of drug.contraindications) {
    if (!c) continue;

    // 1. Kiểm tra cấu hình số học (weightConfig)
    if (c.weightConfig && typeof c.weightConfig.value === "number") {
      const cfgUnit = c.weightConfig.unit || "kg";
      const cfgValKg = cfgUnit === "g" ? c.weightConfig.value / 1000 : c.weightConfig.value;
      const op = c.weightConfig.operator;

      if (op === "<" && weightKg < cfgValKg) return true;
      if (op === "≤" && weightKg <= cfgValKg) return true;
      if (op === ">" && weightKg > cfgValKg) return true;
      if (op === "≥" && weightKg >= cfgValKg) return true;

      // Khoảng chặn trước nếu có
      if (c.weightConfig.operatorBefore && typeof c.weightConfig.valueBefore === "number") {
        const cfgBeforeKg =
          cfgUnit === "g" ? c.weightConfig.valueBefore / 1000 : c.weightConfig.valueBefore;
        const opBefore = c.weightConfig.operatorBefore;
        let matchBefore = false;
        if (opBefore === ">" && weightKg > cfgBeforeKg) matchBefore = true;
        if (opBefore === "≥" && weightKg >= cfgBeforeKg) matchBefore = true;
        if (opBefore === "<" && weightKg < cfgBeforeKg) matchBefore = true;
        if (opBefore === "≤" && weightKg <= cfgBeforeKg) matchBefore = true;

        if (matchBefore) return true;
      }
    }

    // 2. Kiểm tra văn bản chống chỉ định
    const content = (c.content || "").toLowerCase();
    if (content.length > 2) {
      const weightUnderMatches = content.match(
        /(?:dưới|<|≤|không dùng cho bệnh nhân\s*(?:dưới|<)?)\s*(\d+(?:\.\d+)?)\s*kg/g
      );
      if (weightUnderMatches) {
        for (const matchStr of weightUnderMatches) {
          const numMatch = matchStr.match(/(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const limitKg = parseFloat(numMatch[1]);
            if (weightKg < limitKg) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
};

/**
 * Kiểm tra xem một thuốc có phù hợp với cân nặng của bệnh nhân hay không
 */
export const isDrugMatchingWeight = (drug: Drug, config: WeightFilterConfig): boolean => {
  // 1. Nếu có khoảng cân nặng [minWeight, maxWeight]
  if (
    config.minWeight !== undefined &&
    config.minWeight !== null &&
    config.maxWeight !== undefined &&
    config.maxWeight !== null
  ) {
    const minW = config.minWeight;
    const maxW = config.maxWeight;

    // Khoảng mặc định [0, 120+] nghĩa là tất cả cân nặng -> không lọc
    if (minW <= 0 && maxW >= 120 && (config.weight === null || config.weight === undefined)) {
      return true;
    }

    // Nếu 2 mốc trùng nhau, coi như lọc cân nặng đơn lẻ
    if (minW === maxW) {
      return isDrugMatchingWeight(drug, { weight: minW });
    }

    // Kiểm tra chống chỉ định cân nặng trong khoảng
    // Nếu toàn bộ dải đều bị chống chỉ định
    if (isDrugWeightContraindicated(drug, minW) && isDrugWeightContraindicated(drug, maxW)) {
      return false;
    }
    // Nếu dải tập trung ở mức thấp (< 10kg) mà có chống chỉ định trẻ sơ sinh/nhẹ cân
    if (maxW <= 10 && isDrugWeightContraindicated(drug, Math.max(minW, (minW + maxW) / 2))) {
      return false;
    }

    // Kiểm tra hướng dẫn phân liều (dosageAndAdministration)
    const dosages = drug.dosageAndAdministration;
    if (Array.isArray(dosages) && dosages.length > 0) {
      const itemsWithWeight = dosages.filter(
        (d) =>
          (d.weightMin !== undefined && d.weightMin !== null) ||
          (d.weightMax !== undefined && d.weightMax !== null)
      );

      if (itemsWithWeight.length > 0) {
        const hasMatchingWeightDose = itemsWithWeight.some((d) => {
          const minOk = d.weightMax === undefined || d.weightMax === null || d.weightMax >= minW;
          const maxOk = d.weightMin === undefined || d.weightMin === null || d.weightMin <= maxW;
          return minOk && maxOk;
        });

        if (!hasMatchingWeightDose) {
          const hasGeneralDose = dosages.some(
            (d) => d.weightMin === undefined && d.weightMax === undefined
          );
          if (!hasGeneralDose && maxW < 20) {
            return false;
          }
          if (!hasGeneralDose) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // 2. Lọc theo cân nặng đơn lẻ (config.weight)
  const weight = config.weight;
  if (weight === null || weight === undefined || isNaN(weight) || weight <= 0) {
    return true; // Không lọc cân nặng
  }

  // 1. Kiểm tra chống chỉ định theo cân nặng
  if (isDrugWeightContraindicated(drug, weight)) {
    return false;
  }

  // 2. Kiểm tra theo phân liều (dosageAndAdministration)
  const dosages = drug.dosageAndAdministration;
  if (Array.isArray(dosages) && dosages.length > 0) {
    const itemsWithWeight = dosages.filter(
      (d) =>
        (d.weightMin !== undefined && d.weightMin !== null) ||
        (d.weightMax !== undefined && d.weightMax !== null)
    );

    if (itemsWithWeight.length > 0) {
      const hasMatchingWeightDose = itemsWithWeight.some((d) => {
        const minOk = d.weightMin === undefined || d.weightMin === null || weight >= d.weightMin;
        const maxOk = d.weightMax === undefined || d.weightMax === null || weight <= d.weightMax;
        return minOk && maxOk;
      });

      // Nếu các mục liều đều có phân đoạn cân nặng cụ thể mà không bao gồm cân nặng này
      if (!hasMatchingWeightDose) {
        const hasGeneralDose = dosages.some(
          (d) => d.weightMin === undefined && d.weightMax === undefined
        );
        if (!hasGeneralDose && weight < 20) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Kiểm tra xem một thuốc có chống chỉ định với mức lọc cầu thận (eGFR / CrCl) không
 */
export const isDrugRenalContraindicated = (drug: Drug, egfr: number): boolean => {
  if (!drug.contraindications || !Array.isArray(drug.contraindications)) return false;

  for (const c of drug.contraindications) {
    if (!c) continue;
    const content = (c.content || "").toLowerCase();

    // Suy thận nặng hoặc giai đoạn cuối (eGFR < 30 mL/min)
    if (egfr < 30) {
      if (
        content.includes("suy thận nặng") ||
        content.includes("suy thận giai đoạn cuối") ||
        content.includes("lọc máu") ||
        content.includes("chạy thận") ||
        content.includes("crcl < 30") ||
        content.includes("crcl < 15") ||
        content.includes("crcl < 20") ||
        content.includes("egfr < 30") ||
        content.includes("egfr < 15") ||
        content.includes("thanh thải creatinine < 30")
      ) {
        return true;
      }
    }

    // Suy thận vừa (eGFR 30 - 59 mL/min)
    if (egfr < 60) {
      if (
        content.includes("suy thận vừa và nặng") ||
        content.includes("crcl < 50") ||
        content.includes("crcl < 60") ||
        content.includes("egfr < 60") ||
        content.includes("thanh thải creatinine < 50") ||
        content.includes("thanh thải creatinine < 60")
      ) {
        return true;
      }
    }

    // Bất kỳ mức suy thận nào
    if (egfr < 90) {
      if (content.includes("chống chỉ định: suy thận") || content.includes("chống chỉ định cho bệnh nhân suy thận")) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Kiểm tra xem một thuốc có phù hợp với mức lọc cầu thận (eGFR / CrCl) của bệnh nhân hay không
 */
export const isDrugMatchingRenal = (drug: Drug, config: RenalFilterConfig): boolean => {
  // 1. Nếu có khoảng mức lọc cầu thận [minCrcl, maxCrcl]
  if (
    config.minCrcl !== undefined &&
    config.minCrcl !== null &&
    config.maxCrcl !== undefined &&
    config.maxCrcl !== null
  ) {
    const minC = config.minCrcl;
    const maxC = config.maxCrcl;

    // Khoảng mặc định [0, 120+] nghĩa là tất cả mức lọc -> không lọc
    if (minC <= 0 && maxC >= 120 && (config.egfr === null || config.egfr === undefined)) {
      return true;
    }

    // Nếu 2 mốc trùng nhau, coi như lọc mức lọc đơn lẻ
    if (minC === maxC) {
      return isDrugMatchingRenal(drug, { egfr: minC });
    }

    // Kiểm tra chống chỉ định với mức lọc trong khoảng
    if (isDrugRenalContraindicated(drug, minC) && isDrugRenalContraindicated(drug, maxC)) {
      return false;
    }
    // Nếu dải tập trung ở mức suy thận nặng / giai đoạn cuối (< 30 mL/p)
    if (maxC <= 30 && isDrugRenalContraindicated(drug, Math.max(minC, (minC + maxC) / 2))) {
      return false;
    }

    // Kiểm tra hướng dẫn phân liều theo CrCl / eGFR
    const dosages = drug.dosageAndAdministration;
    if (Array.isArray(dosages) && dosages.length > 0) {
      const itemsWithCrCl = dosages.filter(
        (d) =>
          (d.crclMin !== undefined && d.crclMin !== null) ||
          (d.crclMax !== undefined && d.crclMax !== null)
      );

      if (itemsWithCrCl.length > 0) {
        const hasMatchingCrClDose = itemsWithCrCl.some((d) => {
          const minOk = d.crclMax === undefined || d.crclMax === null || d.crclMax >= minC;
          const maxOk = d.crclMin === undefined || d.crclMin === null || d.crclMin <= maxC;
          return minOk && maxOk;
        });

        // Nếu có quy định CrCl nhưng bệnh nhân không nằm trong bất kỳ khung cho phép nào
        // và dải mức lọc bị suy giảm (< 60 mL/min)
        if (!hasMatchingCrClDose && maxC < 60) {
          const hasNormalRenalOnly = itemsWithCrCl.every((d) => (d.crclMin ?? 0) >= 60);
          if (hasNormalRenalOnly) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // 2. Lọc theo mức lọc đơn lẻ (config.egfr)
  const egfr = config.egfr;
  if (egfr === null || egfr === undefined || isNaN(egfr) || egfr < 0) {
    return true; // Không lọc lọc cầu thận
  }

  // 1. Kiểm tra chống chỉ định với mức lọc cầu thận này
  if (isDrugRenalContraindicated(drug, egfr)) {
    return false;
  }

  // 2. Kiểm tra hướng dẫn phân liều theo CrCl / eGFR
  const dosages = drug.dosageAndAdministration;
  if (Array.isArray(dosages) && dosages.length > 0) {
    const itemsWithCrCl = dosages.filter(
      (d) =>
        (d.crclMin !== undefined && d.crclMin !== null) ||
        (d.crclMax !== undefined && d.crclMax !== null)
    );

    if (itemsWithCrCl.length > 0) {
      const hasMatchingCrClDose = itemsWithCrCl.some((d) => {
        const minOk = d.crclMin === undefined || d.crclMin === null || egfr >= d.crclMin;
        const maxOk = d.crclMax === undefined || d.crclMax === null || egfr <= d.crclMax;
        return minOk && maxOk;
      });

      // Nếu thuốc có quy định cụ thể mức CrCl và bệnh nhân có mức lọc này
      if (hasMatchingCrClDose) {
        return true;
      }

      // Nếu có quy định CrCl nhưng bệnh nhân không nằm trong bất kỳ khung cho phép nào
      // và mức lọc suy giảm (<60 mL/min)
      if (egfr < 60) {
        const hasNormalRenalOnly = itemsWithCrCl.every((d) => (d.crclMin ?? 0) >= 60);
        if (hasNormalRenalOnly) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Kết hợp tất cả các bộ lọc lâm sàng (Tuổi, Cân nặng, Lọc cầu thận)
 */
export const isDrugMatchingClinicalFilters = (
  drug: Drug,
  ageConfig: AgeFilterConfig,
  weightConfig: WeightFilterConfig,
  renalConfig: RenalFilterConfig
): boolean => {
  if (!isDrugMatchingAge(drug, ageConfig)) return false;
  if (!isDrugMatchingWeight(drug, weightConfig)) return false;
  if (!isDrugMatchingRenal(drug, renalConfig)) return false;
  return true;
};
