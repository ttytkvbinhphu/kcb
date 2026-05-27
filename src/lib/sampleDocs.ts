export interface ClinicalDocument {
  id: string;
  title: string;
  category: string;
  text: string;
  pdfUrl?: string;
  tagKey?: string;
  decisionNo?: string;
  decisionDate?: string;
  parentOrg?: string;
  issuingOrg?: string;
  issuingLocation?: string;
  addressedTo?: string;
  recipients?: string;
  docType?: string;
  titleItalic?: boolean;
  createdBy?: string;
  creatorName?: string;
  creatorTitle?: string;
  createdAt?: string;
  updatedAt?: string;
  highlights?: any[];
  isHidden?: boolean;
  signer?: string;
  isInternal?: boolean;
}

export const SAMPLE_DOCUMENTS: ClinicalDocument[] = [
  {
    id: "doc_cap",
    title: "Hướng dẫn Điều trị Viêm phổi Cộng đồng (CAP) - Bộ Y Tế",
    category: "Phác đồ điều trị",
    pdfUrl: "https://drive.google.com/file/d/14pQED9OlXOXzAzP4PIZq9b05OXfk2OQA/preview",
    tagKey: "CAP, Viêm phổi",
    decisionNo: "4815/QĐ-BYT",
    decisionDate: "2020-11-20",
    parentOrg: "BỘ Y TẾ",
    issuingOrg: "",
    issuingLocation: "Hà Nội",
    docType: "QUYẾT ĐỊNH",
    titleItalic: true,
    addressedTo: "",
    recipients: "- Như trên;\n- Các Vụ, Cục trực thuộc Bộ Y tế;\n- Sở Y tế các tỉnh, thành phố;\n- Lưu: VT, KCB.",
    text: `HƯỚNG DẪN CHẨN ĐOÁN VÀ ĐIỀU TRỊ VIÊM PHỔI CỘNG ĐỒNG Ở NGƯỜI LỚN\n(Ban hành kèm theo Quyết định số 4815/QĐ-BYT của Bộ trưởng Bộ Y tế)\n\n1. ĐỊNH NGHĨA\nViêm phổi mắc phải ở cộng đồng (Community-Acquired Pneumonia - CAP) là tình trạng nhiễm trùng của nhu mô phổi xảy ra ở ngoài bệnh viện, bao gồm viêm phế nang, ống và túi phế nang, tổ chức kẽ của phổi. Biểu hiện lâm sàng đặc trưng bởi hội chứng đông đặc phổi kèm theo X-quang phổi có tổn thương thâm nhiễm mới.\n\n2. CHẨN ĐOÁN XÁC ĐỊNH\n- Triệu chứng lâm sàng khởi phát cấp tính: sốt cao, rét run, ho đờm mủ đục hoặc đờm màu rỉ sắt, đau ngực kiểu màng phổi, khó thở rên rít hoặc thở nhanh nông.\n- Khám phổi thấy hội chứng đông đặc (gõ đục, rung thanh tăng, phế nang giảm hoặc có rales ẩm rales nổ).\n- Cận lâm sàng: Bạch cầu máu tăng (> 10 G/L) hoặc giảm (< 4 G/L), ưu thế Neutrophil (> 75%). Chỉ số CRP tăng cao (> 50 mg/L) hoặc PCT (Procalcinin) tăng giúp định hướng nhiễm khuẩn.\n- X-quang ngực thẳng: Có tổn thương thâm nhiễm nhu mô phổi mới dạng phế nang (đám mờ hình tam giác có phế quản hơi) hoặc thâm nhiễm kẽ.\n\n3. PHÂN ĐỘ NẶNG THEO THANG ĐIỂM CURB-65\nMỗi tiêu chuẩn đạt được tính 1 điểm:\n- C (Confusion): Lú lẫn, suy giảm nhận thức mới xuất hiện.\n- U (Urea): Urea huyết thanh > 7 mmol/L.\n- R (Respiratory Rate): Tần số thở ≥ 30 lần/phút.\n- B (Blood Pressure): Huyết áp tâm thu < 90 mmHg hoặc huyết áp tâm trương ≤ 60 mmHg.\n- 65 (Age ≥ 65): Tuổi ≥ 65 tuổi.\n\nPhân loại nguy cơ và hướng xử trí:\n- 0 - 1 điểm: Nhóm nhẹ, điều trị ngoại trú tại nhà.\n- 2 điểm: Nhóm trung bình, cân nhắc nhập viện điều trị nội trú ngắn hạn.\n- ≥ 3 điểm: Nhóm nặng, nhập viện điều trị nội trú, nếu 4-5 điểm cần xem xét nhập khoa Hồi sức tích cực (ICU).\n\n4. NGUYÊN TẮC ĐIỀU TRỊ KHÁNG SINH KHI CHƯA CÓ KẾT QUẢ CẤY KHUẨN\na) Điều trị ngoại trú (CURB-65 từ 0-1 điểm):\n- Ở người bệnh không có bệnh đồng mắc, không có nguy cơ kháng thuốc: Amoxicillin uống 1g x 3 lần/ngày HOẶC Clarithromycin uông 500mg x 2 lần/ngày HOẶC Azithromycin uống 500mg/ngày.\n- Ở người bệnh có bệnh đồng mắc (tim, gan, thận, đái tháo đường, COPD): Beta-lactam phối hợp chất ức chế men (Amoxicillin/Clavulanat 1g x 2 lần/ngày HOẶC Cefuroxime 500mg x 2 lần/ngày) PHỐI HỢP với Macrolide (Azithromycin/Clarithromycin). Thay thế bằng Hô hấp Quinon đơn trị liệu (Levofloxacin uống 750mg/ngày HOẶC Moxifloxacin uống 400mg/ngày).\n\nb) Điều trị nội trú (CURB-65 từ 2-3 điểm - Khoa Nội chung):\n- Phác đồ phối hợp: Beta-lactam tiêm truyền TM (Ceftriaxone 2g/ngày HOẶC Cefotaxime 2g x 3 lần/ngày) KÈM THEO Macrolide uống/truyền TM (Clarithromycin/Azithromycin).\n- Phác đồ đơn trị liệu thay thế: Hô hấp Quinolone (Levofloxacin truyền TM 750mg/ngày HOẶC Moxifloxacin truyền TM 400mg/ngày).\n\nc) Điều trị nội trú nặng (CURB-65 từ 4-5 điểm - Nhập ICU):\n- Phác đồ bắt buộc phối hợp kháng sinh hoạt phổ rộng: Beta-lactam khánh khuẩn mạnh (Ceftriaxone 2g/ngày HOẶC Cefotaxime 2g x 3 lần/ngày HOẶC Ertapenem 1g/ngày) PHỐI HỢP VỚI Hô hấp Quinolone truyền TM (Levofloxacin/Moxifloxacin) HOẶC Azithromycin tiêm truyền.\n- Nếu nghi ngờ trực khuẩn mủ xanh (Pseudomonas aeruginosa): Sử dụng kháng sinh Piperacillin/Tazobactam 4.5g x 4 lần/ngày HOẶC Imipenem/Cilastatin 1g x 4 lần/ngày HOẶC Meropenem 1g x 3 lần/ngày PHỐI HỢP VỚI Ciprofloxacin HOẶC Levofloxacin TM.`,
    highlights: [
      {
        id: "hl_cap_1",
        text: "0 - 1 điểm: Nhóm nhẹ, điều trị ngoại trú tại nhà.",
        color: "green",
        category: "Chỉ định",
        note: "Tiêu chuẩn CURB-65 từ 0-1 có thể chỉ định điều trị ngoại trú tại nhà.",
        createdAt: "08:30"
      },
      {
        id: "hl_cap_2",
        text: "nếu 4-5 điểm cần xem xét nhập khoa Hồi sức tích cực (ICU).",
        color: "red",
        category: "Chống chỉ định",
        note: "Trường hợp CURB-65 nặng, bắt buộc chuyển ICU cấp cứu điều trị tích cực.",
        createdAt: "08:32"
      }
    ]
  },
  {
    id: "doc_paracetamol",
    title: "Dược thư Quốc gia: Chuyên luận thông tin lâm sàng Paracetamol",
    category: "Dược thư quốc gia",
    tagKey: "Paracetamol, Hạ sốt",
    decisionNo: "2516/QĐ-BYT",
    decisionDate: "2021-06-15",
    parentOrg: "BỘ Y TẾ",
    issuingOrg: "HỘI ĐỒNG DƯỢC THƯ QUỐC GIA VIỆT NAM",
    issuingLocation: "Hà Nội",
    docType: "CHUYÊN LUẬN LÂM SÀNG",
    titleItalic: false,
    addressedTo: "Các cơ sở khám bệnh, chữa bệnh trên toàn quốc",
    recipients: "- Như kính gửi;\n- Vụ Trang thiết bị và Công trình Y tế;\n- Lưu: VT, HĐDTQG.",
    text: `CHUYÊN LUẬN PARACETAMOL (ACETAMINOPHEN)\nDược thư Quốc gia Việt Nam - Chuyên luận chính thức\n\n1. DƯỢC LÝ VÀ CƠ CHẾ TÁC DỤNG\nParacetamol là chất hạ sốt - giảm đau tổng hợp, là dẫn chất của phenacetin. Thuốc có tác dụng giảm đau và hạ sốt tương đương aspirin nhưng không có hiệu quả chống viêm trên hệ thống ngoại vi, không ảnh hưởng đến chức năng tiểu cầu hoặc thời gian chảy máu ở liều điều trị thông thường.\n\n- Cơ chế hạ sốt: Tác động trực tiếp lên vùng dưới đồi (trung tâm điều nhiệt), gây giãn mạch và tăng lưu lượng máu ngoại biên, dẫn đến tăng tỏa nhiệt và hạ thân nhiệt ở người bị sốt. Ít khi làm giảm thân nhiệt ở người bình thường.\n- Cơ chế giảm đau: Ức chế tổng hợp prostaglandin trong hệ thần kinh trung ương (CNS), tăng ngưỡng chịu đau của cơ thể. \n\n2. CHỈ ĐỊNH LÂM SÀNG\n- Điều trị triệu chứng đau nhẹ đến trung bình: Đau đầu, đau nửa đầu, đau răng, đau cơ xương khớp cấp, đau bụng kinh, đau sau phẫu thuật nhỏ, đau dây thần kinh.\n- Điều trị triệu chứng sốt do mọi nguyên nhân ở cả người lớn và trẻ em.\n\n3. LIỀU LƯỢNG VÀ CÁCH DÙNG\na) Người lớn và trẻ em ≥ 12 tuổi:\n- Liều thông thường uống: 500 mg - 1000 mg mỗi 4 - 6 giờ khi cần thiết. \n- Liều tối đa hàng ngày không được vượt quá 4g (4000 mg) để tránh nguy cơ ngộ độc gan nặng.\n- Khoảng cách tối thiểu giữa hai lần dùng liên tiếp là 4 giờ.\n\nb) Trẻ em dưới 12 tuổi:\n- Tính liều chính xác theo cân nặng: 10 - 15 mg/kg thể trọng cho mỗi liều.\n- Dùng cách nhau mỗi 4 - 6 giờ nếu cần.\n- Liều tối đa hàng ngày: Không quá 60 mg/kg thể trọng trong 24 giờ.\n\n4. CHỐNG CHỈ ĐỊNH VÀ THẬN TRỌNG\n- Chống chỉ định hoàn toàn ở người bệnh có tiền sử quá mẫn với paracetamol hoặc bất kỳ thành phần nào của thuốc.\n- Người bệnh bị suy gan nặng, viêm gan hoạt động, hoặc suy thận nặng trong các trường hợp tích lũy liều cao.\n- Thận trọng lớn ở người bệnh nghiện rượu mãn tính, thiếu hụt men G6PD ( Glucose-6-phosphate dehydrogenase) do nguy cơ gây tan máu cấp tính.\n- Người bệnh có tiền sử thiếu máu nhiều lần hoặc bệnh tim, gan, thận tiến triển.\n\n5. ĐỘC TÍNH VÀ XỬ TRÍ QUÁ LIỀU\nNgộ độc paracetamol cấp tính xảy ra khi uống một liều đơn độc ≥ 7.5g - 10g ở người lớn hoặc ≥ 150 mg/kg ở trẻ em, dẫn đến hoại tử tế bào gan nghiêm trọng và có thể tử vong do suy gan cấp.\n\n- Triệu chứng sớm nguy hiểm: buồn nôn, nôn, biếng ăn, da xanh xao, vã mồ hôi, đau hạ sườn phải từ sau 24 - 48 giờ. Chỉ số men gan AST/ALT tăng vọt sau 48-72 giờ.\n- Chất giải độc đặc hiệu bắt buộc: N-acetylcystein (NAC). Phác đồ truyền tĩnh mạch hoặc đường uống bắt đầu ngay lập tức, tối ưu nhất trong vòng 8-10 giờ đầu sau khi uống paracetamol để đạt hiệu quả bảo vệ gan tối đa.`,
    highlights: [
      {
        id: "hl_para_1",
        text: "Liều tối đa hàng ngày không được vượt quá 4g (4000 mg) để tránh nguy cơ ngộ độc gan nặng.",
        color: "red",
        category: "Chống chỉ định",
        note: "Ngưỡng độc tính gan cực kỳ nghiêm trọng, không vượt quá 4g/ngày.",
        createdAt: "08:35"
      },
      {
        id: "hl_para_2",
        text: "Chất giải độc đặc hiệu bắt buộc: N-acetylcystein (NAC).",
        color: "blue",
        category: "Lưu ý",
        note: "Chỉ định NAC ngay lập tức nếu nghi ngờ quá liều Paracetamol.",
        createdAt: "08:37"
      }
    ]
  },
  {
    id: "doc_hypertension",
    title: "Hướng dẫn chẩn đoán và điều trị Tăng huyết áp 2024 - VNHA/VSH",
    category: "Phác đồ điều trị",
    pdfUrl: "https://drive.google.com/file/d/14pQED9OlXOXzAzP4PIZq9b05OXfk2OQA/preview",
    tagKey: "THA, Tim mạch",
    decisionNo: "1206/QĐ-BYT",
    decisionDate: "2024-03-12",
    parentOrg: "SỞ Y TẾ TỈNH QUẢNG NINH",
    issuingOrg: "TRUNG TÂM Y TẾ KHU VỰC BẢN LÌN",
    issuingLocation: "Quảng Ninh",
    docType: "HƯỚNG DẪN CHUYÊN MÔN",
    titleItalic: true,
    addressedTo: "Khoa Nội tổng hợp và các trạm y tế trực thuộc",
    recipients: "- Như trên;\n- Lưu: Ban Giám Đốc, phòng KHNV;\n- Lưu: VT, TTYT.",
    text: `KHUYẾN NGHỊ CHẨN ĐOÁN VÀ ĐIỀU TRỊ TĂNG HUYẾT ÁP - TÓM TẮT LÂN SÀNG 2024\nPhân hội Tăng huyết áp Việt Nam (VSH/VNHA)\n\n1. ĐỊNH NGHĨA VÀ PHÂN LOẠI CON SỐ HUYẾT ÁP (Huyết áp phòng khám - mmHg)\n- Huyết áp tối ưu: Tâm thu < 120 mmHg VÀ Tâm trương < 80 mmHg.\n- Huyết áp bình thường: Tâm thu 120-129 mmHg VÀ/HOẶC Tâm trương 80-84 mmHg.\n- Tiền tăng huyết áp: Tâm thu 130-139 mmHg VÀ/HOẶC Tâm trương 85-89 mmHg.\n- Tăng huyết áp Độ 1: Tâm thu 140-159 mmHg VÀ/HOẶC Tâm trương 90-99 mmHg.\n- Tăng huyết áp Độ 2: Tâm thu 160-179 mmHg VÀ/HOẶC Tâm trương 100-109 mmHg.\n- Tăng huyết áp Độ 3: Tâm thu ≥ 180 mmHg VÀ/HOẶC Tâm trương ≥ 110 mmHg.\n- Tăng huyết áp tâm thu đơn độc: Tâm thu ≥ 140 mmHg VÀ Tâm trương < 90 mmHg.\n\n2. NGUYÊN TẮC PHỐI HỢP THUỐC BAN ĐẦU (Khởi trị tối ưu)\nKhuyến nghị mới nhất nhấn mạnh việc sử dụng phối hợp thuốc liều cố định (SPC - Single Pill Combination) ngay từ đầu cho hầu hết bệnh nhân (ngoại trừ bệnh nhân rất già, sức khỏe yếu hoặc THA Độ 1 nguy cơ thấp).\n\nCác nhóm thuốc điều trị chính (Bộ 5 thuốc đầu tay):\n- ƯCMC (Ức chế men chuyển - ACEi): Captopril, Enalapril, Lisinopril, Perindopril.\n- Chẹn thụ thể (ARB): Losartan, Valsartan, Candesartan, Telmisartan.\n- Chẹn kênh Canxi (CCB): Amlodipine, Felodipine, Nifedipine.\n- Lợi tiểu nhóm Thiazide/Thiazide-like: Hydrochlorothiazide, Indapamide, Chlorthalidone.\n- Chẹn Beta (BB) - Ưu tiên khi có chỉ định bắt buộc (Nhồi máu cơ tim, suy tim, mạch nhanh, đau thắt ngực hoặc phụ nữ mang thai).\n\nPhác đồ 3 Bước khởi trị chuẩn:\n- Bước 1 (Phối hợp đôi): ACEi HOẶC ARB + CCB HOẶC Lợi tiểu Thiazide. Nên dùng dưới dạng viên phối hợp cố định đơn liều.\n- Bước 2 (Phối hợp ba): ACEi HOẶC ARB + CCB + Lợi tiểu Thiazide.\n- Bước 3 (THA kháng trị): Thêm Spironolactone (25-50 mg/ngày) phối hợp vào phác đồ 3 thuốc trên, hoặc cân nhắc bổ sung thuốc chẹn Alpha hoặc chẹn Beta tùy triệu chứng tim mạch kèm theo.\n\n3. MỤC TIÊU HUYẾT ÁP ĐIỀU TRỊ CẦN ĐẠT\n- Ngưỡng chung cho hầu hết bệnh nhân người lớn bị THA: Kiểm soát hạ huyết áp xu hướng về < 130/80 mmHg nếu người bệnh dung nạp tốt, nhưng không được thấp dưới 120/70 mmHg để bảo toàn tưới máu cơ quan đích.\n- Ở những bệnh nhân ≥ 70 tuổi: Kiểm soát huyết áp tâm thu mục tiêu mục đích ở mức 130 - 139 mmHg.`,
    highlights: [
      {
        id: "hl_hyper_1",
        text: "Bước 1 (Phối hợp đôi): ACEi HOẶC ARB + CCB HOẶC Lợi tiểu Thiazide. Nên dùng dưới dạng viên phối hợp cố định đơn liều.",
        color: "orange",
        category: "Liều dùng",
        note: "Phác đồ khởi trị phối hợp đôi ưu tiên thuốc phối hợp đơn liều SPC.",
        createdAt: "08:40"
      },
      {
        id: "hl_hyper_2",
        text: "Kiểm soát hạ huyết áp xu hướng về < 130/80 mmHg nếu người bệnh dung nạp tốt",
        color: "green",
        category: "Lưu ý",
        note: "Đích kiểm soát huyết áp chung cho bệnh nhân tăng huyết áp.",
        createdAt: "08:42"
      }
    ]
  }
];
