export interface PharmacopoeiaForeword {
  title: string;
  edition: string;
  publisher: string;
  decisionNumber: string;
  effectiveDate: string;
  content: string;
  chiefEditor?: string;
  councilMembers?: string[];
  guidelinesSummary?: string;
  signatoryTitle?: string;
  signatoryName?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PHARMACOPOEIA_FOREWORD: PharmacopoeiaForeword = {
  title: 'Lời nói đầu Dược thư Quốc gia Việt Nam',
  edition: 'Dược thư Quốc gia Việt Nam Lần thứ ba (Ấn bản III)',
  publisher: 'Bộ Y Tế - Hội đồng Dược thư Quốc gia',
  decisionNumber: 'Quyết định số 4068/QĐ-BYT của Bộ trưởng Bộ Y tế',
  effectiveDate: '23/12/2022',
  content: `Dược thư Quốc gia Việt Nam là tài liệu chính thức của Bộ Y tế về hướng dẫn sử dụng thuốc hợp lý, an toàn và hiệu quả. Đây là công trình khoa học mang tính quy phạm kỹ thuật chuyên môn sâu, là cẩm nang thiết yếu cho các thầy thuốc, dược sĩ, điều dưỡng viên và cán bộ y tế trong toàn bộ công tác khám chữa bệnh tại các cơ sở y tế trên toàn quốc.

Bộ Y tế giao cho Hội đồng Dược thư Quốc gia Việt Nam tổ chức biên soạn và cập nhật liên tục các chuyên khảo thuốc. Các thông tin trong Dược thư được biên soạn trên cơ sở y học thực chứng, tham khảo các dược thư và hướng dẫn điều trị uy tín hàng đầu trên thế giới (như Dược thư Anh BNF, Dược thư Mỹ USP-DI, Tổ chức Y tế Thế giới WHO) kết hợp chặt chẽ với tình hình dịch tễ học, mô hình bệnh tật và thực tiễn lâm sàng tại Việt Nam.

Mỗi chuyên khảo cung cấp đầy đủ thông tin chuẩn xác về tên thuốc, mã giải phẫu điều trị hóa học (ATC), dạng thuốc và hàm lượng, dược lực học, dược động học, chỉ định điều trị, chống chỉ định, thận trọng khi dùng (đặc biệt đối với phụ nữ mang thai, cho con bú, người cao tuổi, người suy gan, suy thận), liều dùng - cách dùng chi tiết, tác dụng không mong muốn (ADR), tương tác thuốc và xử trí khi quá liều.

Hội đồng Dược thư Quốc gia Việt Nam tin tưởng rằng Dược thư Quốc gia Việt Nam sẽ là nguồn tài liệu tra cứu đắc lực, đồng hành cùng đội ngũ y bác sĩ, dược sĩ trong mọi quyết định lâm sàng và kê đơn, góp phần nâng cao chất lượng chăm sóc và bảo vệ sức khỏe nhân dân.`,
  chiefEditor: 'GS. TS. Nguyễn Thanh Long - Nguyên Bộ trưởng Bộ Y tế',
  councilMembers: [
    'PGS. TS. Lê Văn Truyền - Nguyên Thứ trưởng Bộ Y tế, Phó Chủ tịch Hội đồng Dược thư Quốc gia',
    'GS. TS. Hoàng Thị Kim Huyền - Chủ tịch Hội đồng chuyên môn Dược lâm sàng',
    'PGS. TS. Nguyễn Đăng Hòa - Nguyên Hiệu trưởng Trường Đại học Dược Hà Nội',
    'TS. Dược sĩ Nguyễn Huy Cường - Ban Thư ký Hội đồng Dược thư Quốc gia',
    'Các chuyên gia đầu ngành từ Trường ĐH Y Hà Nội, ĐH Dược Hà Nội, ĐH Y Dược TP.HCM và các Bệnh viện tuyến Trung ương'
  ],
  guidelinesSummary: 'Dược thư Quốc gia Việt Nam có giá trị pháp lý chuyên môn làm căn cứ xây dựng Danh mục thuốc thiết yếu, Danh mục thuốc bảo hiểm y tế, quy trình hướng dẫn sử dụng thuốc tại bệnh viện và công tác giám sát dược lâm sàng, cảnh giác dược.',
  signatoryTitle: 'Thay mặt Bộ Y tế & Hội đồng Dược thư Quốc gia',
  signatoryName: 'Chủ tịch Hội đồng Dược thư Quốc gia Việt Nam',
  updatedAt: '2023-01-01T00:00:00.000Z'
};

export interface PharmacopoeiaMonograph {
  id: string;
  vietnameseName: string; // Tên tiếng Việt (VD: Paracetamol, Amoxicilin)
  internationalName: string; // Tên chung quốc tế (INN)
  atcCode: string;
  pharmacologicalGroup: string; // Nhóm dược lý
  therapeuticCategory: string; // Nhóm trị liệu
  edition: string; // Dược thư QG VN (VD: "Dược thư QG VN III", "Dược thư QG VN II")
  dosageForms: string[]; // Dạng thuốc & Hàm lượng
  pharmacology: {
    mechanism: string; // Dược lực học / Cơ chế tác dụng
    pharmacokinetics: string; // Dược động học (Hấp thu, Phân bố, Chuyển hóa, Thải trừ)
  };
  indications: string[]; // Chỉ định
  contraindications: string[]; // Chống chỉ định
  cautions: {
    general: string;
    pregnancy: string; // Phụ nữ mang thai
    lactation: string; // Phụ nữ cho con bú
    elderly?: string; // Người cao tuổi
    hepaticImpairment?: string; // Suy gan
    renalImpairment?: string; // Suy thận
  };
  dosageAndAdministration: {
    general: string;
    adults: string;
    children?: string;
    specialPopulations?: string;
  };
  adverseReactions: {
    frequency: 'Thường gặp (ADR > 1/100)' | 'Ít gặp (1/1000 < ADR < 1/100)' | 'Hiếm gặp (ADR < 1/1000)' | 'Chưa rõ tần suất';
    effects: string[];
  }[];
  drugInteractions: string[]; // Tương tác thuốc
  toxicityAndOverdose: {
    symptoms: string;
    management: string; // Xử trí ngộ độc / Giải độc
  };
  storage: string; // Bảo quản
  notes?: string;
}

export const PHARMACOPOEIA_DATA: PharmacopoeiaMonograph[] = [
  {
    id: 'paracetamol',
    vietnameseName: 'Paracetamol',
    internationalName: 'Paracetamol (Acetaminophen)',
    atcCode: 'N02BE01',
    pharmacologicalGroup: 'Thuốc giảm đau - hạ sốt không Opioid',
    therapeuticCategory: 'Thần kinh & Giảm đau',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nén / nang: 325 mg, 500 mg, 650 mg',
      'Gói bột sủi bọt / Cốm: 80 mg, 150 mg, 250 mg, 500 mg',
      'Dung dịch uống / Siro: 120 mg/5ml, 160 mg/5ml, 250 mg/5ml',
      'Viên đạn đặt trực tràng: 80 mg, 150 mg, 300 mg',
      'Dung dịch tiêm truyền: 10 mg/ml (Chai 50ml, 100ml)'
    ],
    pharmacology: {
      mechanism: 'Paracetamol (acetaminophen) là dẫn chất của para-aminophenol, có tác dụng giảm đau và hạ sốt tương đương aspirin. Thuốc làm giảm thân nhiệt ở người bị sốt nhờ tác động lên trung khu điều nhiệt ở vùng dưới đồi gây giãn mạch và tăng lưu lượng máu ngoại biên. Khác với NSAIDs, paracetamol hầu như không có tác dụng chống viêm và không ức chế kết tập tiểu cầu ở liều điều trị.',
      pharmacokinetics: 'Hấp thu nhanh và gần như hoàn toàn qua đường tiêu hóa. Nồng độ đỉnh trong huyết tương đạt sau 30-60 phút sau khi uống. Phân bố nhanh và đồng đều trong phần lớn các mô. Tỷ lệ gắn kết protein huyết tương thấp (khoảng 10-25% ở liều điều trị). Chuyển hóa chủ yếu tại gan qua liên hợp acid glucuronic và sulfuric. Một lượng nhỏ (khoảng 4%) được chuyển hóa bởi CYP2E1 tạo thành chất chuyển hóa độc N-acetyl-p-benzoquinone imine (NAPQI), chất này bị khử độc bởi glutathione. Thải trừ qua nước tiểu chủ yếu dưới dạng liên hợp, t1/2 khoảng 1.25 - 3 giờ.'
    },
    indications: [
      'Điều trị các cơn đau nhẹ đến vừa: đau đầu, đau nửa đầu, đau cơ, đau răng, đau dây thần kinh, đau bụng kinh, đau sau phẫu thuật nhỏ hoặc chấn thương nhẹ.',
      'Hạ sốt do mọi nguyên nhân: nhiễm khuẩn, nhiễm virus, sốt sau tiêm chủng vaccine, cảm cúm.'
    ],
    contraindications: [
      'Người bệnh quá mẫn với paracetamol hoặc bất kỳ tá dược nào của thuốc.',
      'Người bệnh suy gan nặng hoặc bệnh gan tiến triển.',
      'Người bệnh thiếu hụt glucose-6-phosphat dehydrogenase (G6PD).'
    ],
    cautions: {
      general: 'Bác sĩ cần cảnh báo về các dấu hiệu của phản ứng trên da nghiêm trọng như hội chứng Stevens-Johnson (SJS), hội chứng hoại tử màng thượng bì nhiễm độc (TEN), hội chứng Lyell, hội chứng ngoại ban mụn mủ toàn thân cấp tính (AGEP). Không dùng chung với các thuốc khác có chứa paracetamol.',
      pregnancy: 'Paracetamol đi qua nhau thai. Chưa thấy nguy cơ tăng dị tật bẩm sinh hoặc độc tính đối với thai nhi ở liều điều trị. Có thể dùng trong thai kỳ nhưng chỉ dùng ở liều thấp nhất có hiệu quả và trong thời gian ngắn nhất.',
      lactation: 'Paracetamol bài tiết một lượng nhỏ vào sữa mẹ (dưới 1-2% liều của mẹ). Chưa thấy tác dụng phụ nào ở trẻ bú mẹ. Được coi là tương thích với việc cho con bú.',
      hepaticImpairment: 'Cần thận trọng và giảm liều ở bệnh nhân suy gan nhẹ - vừa, người nghiện rượu mạn tính, người suy dinh dưỡng kéo dài hoặc mất nước.',
      renalImpairment: 'Ở bệnh nhân suy thận nặng (ClCr < 10 ml/phút), cần kéo dài khoảng cách giữa các liều lên ít nhất 8 giờ.'
    },
    dosageAndAdministration: {
      general: 'Dùng đường uống, tiêm truyền tĩnh mạch hoặc đặt trực tràng. Uống cùng hoặc không cùng thức ăn.',
      adults: 'Uống 500 mg - 1000 mg mỗi 4 - 6 giờ khi cần. Tối đa không quá 4 g (4000 mg)/ngày đối với người lớn không có bệnh lý nền về gan. Liều truyền tĩnh mạch: 1000 mg mỗi 4-6 giờ, tối đa 4 g/ngày.',
      children: 'Uống 10 - 15 mg/kg mỗi 4 - 6 giờ khi cần. Tối đa không quá 60 mg/kg/ngày hoặc 2 g/ngày. Khoảng cách giữa các liều tối thiểu 4 giờ.',
      specialPopulations: 'Người suy gan, nghiện rượu mạn tính: liều tối đa không quá 2 g/ngày (2000 mg/24 giờ).'
    },
    adverseReactions: [
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Ban da, mày đay, ngứa', 'Buồn nôn, nôn', 'Rối loạn tạo máu (giảm bạch cầu trung tính, giảm tiểu cầu, giảm toàn thể huyết cầu)', 'Thiếu máu, độc tính thận khi lạm dụng dài ngày']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Phản ứng quá mẫn, sốc phản vệ', 'Hội chứng Stevens-Johnson (SJS), hội chứng Lyell (TEN)', 'Viêm gan, hoại tử tế bào gan cấp tính khi quá liều']
      }
    ],
    drugInteractions: [
      'Rượu (Alcohol): Tăng nguy cơ độc tính trên gan do cảm ứng enzym CYP2E1 tạo nhiều NAPQI.',
      'Thuốc chống đông máu (Warfarin, Coumarin): Dùng paracetamol liều cao kéo dài (> 2g/ngày trong 4 ngày) có thể làm tăng nhẹ tác dụng chống đông.',
      'Các thuốc cảm ứng enzym gan (Phenobarbital, Phenytoin, Carbamazepin, Rifampicin, Isoniazid): Tăng nguy cơ độc gan của paracetamol.',
      'Metoclopramid và Domperidon: Làm tăng tốc độ hấp thu của paracetamol.',
      'Cholestyramin: Làm giảm hấp thu của paracetamol (uống cách nhau ít nhất 1 giờ).'
    ],
    toxicityAndOverdose: {
      symptoms: 'Nhiễm độc paracetamol có thể do dùng 1 liều độc duy nhất (≥ 7.5g ở người lớn hoặc ≥ 150 mg/kg ở trẻ em) hoặc do dùng liều cao lặp lại. Giai đoạn sớm (0-24h): Buồn nôn, nôn, chán ăn, tái nhợt, đau bụng. Giai đoạn muộn (24-72h): Dấu hiệu tổn thương gan rõ rệt (tăng men gan AST, ALT, tăng bilirubin, kéo dài INR), có thể dẫn đến suy gan tối cấp, hôn mê gan và tử vong.',
      management: 'Chẩn đoán sớm rất quan trọng. Rửa dạ dày nếu mới uống trong vòng 1-2 giờ. Dùng than hoạt. Chất giải độc đặc hiệu là N-acetylcystein (NAC) đường uống hoặc tiêm tĩnh mạch. Hiệu quả nhất khi dùng trong vòng 8-10 giờ đầu sau khi uống quá liều.'
    },
    storage: 'Bảo quản trong bao bì kín, ở nơi khô ráo, tránh ánh sáng trực tiếp, nhiệt độ dưới 30°C.'
  },
  {
    id: 'amoxicillin',
    vietnameseName: 'Amoxicilin',
    internationalName: 'Amoxicillin',
    atcCode: 'J01CA04',
    pharmacologicalGroup: 'Kháng sinh nhóm Penicillin phổ rộng (Aminopenicillin)',
    therapeuticCategory: 'Kháng sinh & Chống nhiễm khuẩn',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nang / nén: 250 mg, 500 mg, 875 mg, 1000 mg',
      'Gói bột / Cốm pha hỗn dịch uống: 125 mg, 250 mg, 500 mg',
      'Bột pha tiêm: 500 mg, 1000 mg'
    ],
    pharmacology: {
      mechanism: 'Amoxicilin là aminopenicillin bán tổng hợp, có tác dụng diệt khuẩn. Cơ chế diệt khuẩn là do ức chế sinh tổng hợp mucopeptid của thành tế bào vi khuẩn thông qua gắn kết với các protein gắn penicillin (PBPs). Thuốc có phổ tác dụng rộng trên cả vi khuẩn Gram dương và Gram âm như Streptococcus spp., Enterococcus faecalis, Listeria monocytogenes, H. influenzae, E. coli, Proteus mirabilis, Salmonella spp., Helicobacter pylori. Thuốc bị phân hủy bởi beta-lactamase.',
      pharmacokinetics: 'Bền vững trong môi trường acid dịch vị, hấp thu qua đường tiêu hóa tốt hơn ampicilin (khoảng 75-90% liều uống). Thức ăn không ảnh hưởng đáng kể đến mức độ hấp thu. Phân bố rộng rãi vào các mô và dịch cơ thể (dịch tai giữa, đờm, dịch màng phổi, dịch mật). Gắn kết protein huyết tương khoảng 20%. Khoảng 60% liều uống đào thải qua nước tiểu ở dạng không đổi trong vòng 6-8 giờ qua lọc cầu thận và bài tiết ở ống thận. t1/2 khoảng 1 - 1.5 giờ ở người có chức năng thận bình thường.'
    },
    indications: [
      'Nhiễm khuẩn đường hô hấp trên: Viêm xoang cấp, viêm tai giữa cấp tính, viêm họng, viêm amidan do Streptococcus pyogenes.',
      'Nhiễm khuẩn đường hô hấp dưới: Đợt cấp của viêm phế quản mạn tính, viêm phổi mắc phải tại cộng đồng (CAP).',
      'Nhiễm khuẩn đường tiết niệu không biến chứng: Viêm bàng quang cấp, viêm niệu đạo.',
      'Nhiễm khuẩn da và mô mềm.',
      'Nhiễm khuẩn răng miệng: Áp xe quanh chân răng.',
      'Phối hợp với thuốc ức chế bơm proton (PPI) và clarithromycin/metronidazol để tiệt trừ Helicobacter pylori trong loét dạ dày - tá tràng.',
      'Dự phòng viêm nội tâm mạc nhiễm khuẩn ở các đối tượng nguy cơ trước các thủ thuật nha khoa.'
    ],
    contraindications: [
      'Tiền sử dị ứng / quá mẫn với amoxicilin, bất kỳ penicillin nào hoặc các thành phần khác.',
      'Tiền sử phản ứng quá mẫn tức thì nghiêm trọng (như sốc phản vệ) với thuốc nhóm beta-lactam khác (cephalosporin, carbapenem, monobactam).'
    ],
    cautions: {
      general: 'Cần khai thác kỹ tiền sử dị ứng penicillin và cephalosporin trước khi dùng thuốc. Nếu xuất hiện phản ứng dị ứng, phải ngừng thuốc ngay. Thận trọng nguy cơ viêm đại tràng giả mạc do Clostridioides difficile. Không dùng điều trị cho bệnh nhân tăng bạch cầu đơn nhân nhiễm khuẩn (nhiễm virus Epstein-Barr) vì tỷ lệ phát ban dạng sởi rất cao.',
      pregnancy: 'Amoxicilin qua được nhau thai. Dữ liệu trên phụ nữ mang thai không cho thấy nguy cơ dị tật bẩm sinh hay độc tính cho thai nhi. Amoxicilin được xem là kháng sinh an toàn hàng đầu trong thai kỳ.',
      lactation: 'Thuốc bài tiết một lượng rất nhỏ vào sữa mẹ. Có thể dùng cho phụ nữ đang cho con bú, tuy nhiên cần theo dõi trẻ về tiêu chảy hoặc nhiễm nấm Candida.',
      hepaticImpairment: 'Thận trọng ở bệnh nhân suy gan, định kỳ kiểm tra chức năng gan.',
      renalImpairment: 'Cần chỉnh liều dựa theo độ thanh thải creatinin (ClCr). Nếu ClCr 10-30 ml/phút: tối đa 500 mg mỗi 12 giờ. Nếu ClCr < 10 ml/phút: tối đa 500 mg mỗi 24 giờ.'
    },
    dosageAndAdministration: {
      general: 'Uống trước hoặc sau bữa ăn đều được. Uống trọn viên thuốc với một cốc nước đầy.',
      adults: 'Nhiễm khuẩn nhẹ - vừa: 500 mg mỗi 8 giờ hoặc 875 mg - 1000 mg mỗi 12 giờ. Nhiễm khuẩn nặng / Viêm phổi: 1000 mg mỗi 8 giờ. Phác đồ tiệt trừ H. pylori: 1000 mg x 2 lần/ngày trong 14 ngày. Dự phòng viêm nội tâm mạc: 2 g uống 30-60 phút trước thủ thuật.',
      children: 'Trẻ em ≥ 3 tháng tuổi: 20 - 50 mg/kg/ngày chia làm 2-3 lần (tối đa 1500 mg/ngày). Viêm tai giữa cấp / Viêm xoang liều cao: 80 - 90 mg/kg/ngày chia 2-3 lần.',
      specialPopulations: 'Bệnh nhân suy thận: Điều chỉnh liều theo ClCr như phần thận trọng.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Ngoại ban da, ngứa (xuất hiện sau 7-10 ngày dùng thuốc)', 'Tiêu chảy, buồn nôn, khó chịu dạ dày ruột']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Nôn', 'Mày đay, ban đỏ đa dạng', 'Tăng men gan AST, ALT nhẹ và thoáng qua']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Phản ứng phản vệ, phù Quincke', 'Viêm đại tràng màng giả do C. difficile', 'Hội chứng Stevens-Johnson, hoại tử biểu bì nhiễm độc (TEN)', 'Giảm bạch cầu, giảm tiểu cầu, thiếu máu tán huyết', 'Viêm thận kẽ cấp tính']
      }
    ],
    drugInteractions: [
      'Probenecid: Làm giảm bài tiết amoxicilin ở ống thận, dẫn đến tăng nồng độ và kéo dài thời gian bán thải của amoxicilin trong máu.',
      'Allopurinol: Dùng đồng thời với amoxicilin làm tăng đáng kể tỷ lệ phát ban trên da.',
      'Thuốc chống đông đường uống (Warfarin): Có thể làm tăng INR và kéo dài thời gian prothrombin.',
      'Methotrexat: Amoxicilin làm giảm thanh thải methotrexat, tăng nguy cơ độc tính của methotrexat.',
      'Thuốc tránh thai đường uống: Có thể làm giảm hiệu lực của thuốc tránh thai đường uống (khuyên dùng thêm biện pháp tránh thai cơ học).'
    ],
    toxicityAndOverdose: {
      symptoms: 'Các triệu chứng tiêu hóa (buồn nôn, nôn, tiêu chảy) và rối loạn cân bằng nước điện giải. Tinh thể niệu amoxicilin dẫn đến suy thận cấp có thể xảy ra ở liều rất cao.',
      management: 'Chủ yếu điều trị triệu chứng và hồi sức nâng đỡ. Chú ý duy trì đủ nước và lượng nước tiểu bài tiết để tránh tinh thể niệu. Amoxicilin có thể được loại bỏ khỏi tuần hoàn bằng phương pháp thẩm tách máu (chạy thận nhân tạo).'
    },
    storage: 'Bảo quản dưới 30°C ở nơi khô mát, tránh ẩm và ánh sáng. Hỗn dịch sau khi pha bảo quản ở 2-8°C dùng trong 7-14 ngày.'
  },
  {
    id: 'ciprofloxacin',
    vietnameseName: 'Ciprofloxacin',
    internationalName: 'Ciprofloxacin',
    atcCode: 'J01MA02',
    pharmacologicalGroup: 'Kháng sinh nhóm Fluoroquinolon',
    therapeuticCategory: 'Kháng sinh & Chống nhiễm khuẩn',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nén bao phim: 250 mg, 500 mg, 750 mg',
      'Dung dịch tiêm truyền tĩnh mạch: 200 mg/100ml, 400 mg/200ml',
      'Dung dịch nhỏ mắt / nhỏ tai: 0.3%'
    ],
    pharmacology: {
      mechanism: 'Ciprofloxacin là kháng sinh tổng hợp nhóm fluoroquinolon thế hệ 2 có phổ kháng khuẩn rộng và hoạt lực diệt khuẩn mạnh. Thuốc ức chế enzym DNA gyrase (topoisomerase II) và topoisomerase IV của vi khuẩn, ngăn cản quá trình sao chép, phiên mã, sửa chữa và tái tổ hợp DNA của vi khuẩn. Rất nhạy cảm với hầu hết các trực khuẩn Gram âm (Enterobacteriaceae, Pseudomonas aeruginosa) và một số cầu khuẩn Gram dương.',
      pharmacokinetics: 'Hấp thu nhanh và tốt qua đường tiêu hóa (sinh khả dụng 70-80%). Nồng độ đỉnh huyết tương đạt sau 1-2 giờ. Phân bố rộng vào hầu hết các mô cơ thể, dịch cơ thể, xương, thận, tiền liệt tuyến. Gắn kết protein huyết tương khoảng 20-40%. Chuyển hóa một phần ở gan thành các chất chuyển hóa có hoạt tính yếu. Đào thải chủ yếu qua thận (khoảng 40-50% qua nước tiểu ở dạng không đổi) và một phần qua mật và phân. t1/2 khoảng 4 - 6 giờ.'
    },
    indications: [
      'Nhiễm khuẩn đường tiết niệu phức tạp và viêm đài bể thận.',
      'Viêm tuyến tiền liệt mạn tính do vi khuẩn.',
      'Nhiễm khuẩn đường hô hấp dưới do vi khuẩn Gram âm: đợt cấp viêm phế quản mạn tính, giãn phế quản bội nhiễm.',
      'Nhiễm khuẩn đường tiêu hóa: tiêu chảy nhiễm khuẩn nặng, lỵ trực khuẩn do Shigella, tả, sốt thương hàn (Salmonella typhi).',
      'Nhiễm khuẩn ổ bụng phức tạp (phối hợp với metronidazol).',
      'Nhiễm khuẩn xương khớp do trực khuẩn Gram âm.',
      'Dự phòng và điều trị bệnh than sau phơi nhiễm (Bacillus anthracis).'
    ],
    contraindications: [
      'Tiền sử quá mẫn với ciprofloxacin hoặc các quinolon khác.',
      'Dùng đồng thời với tizanidin (nguy cơ hạ huyết áp nghiêm trọng và buồn ngủ quá mức).',
      'Tiền sử bệnh gân đứt gân hoặc viêm gân do fluoroquinolon.'
    ],
    cautions: {
      general: 'Cảnh báo về nguy cơ viêm gân và đứt gân gót (Achilles), có thể xảy ra trong vài giờ đến vài tháng sau khi dùng. Nguy cơ bệnh thần kinh ngoại biên, rối loạn hệ thần kinh trung ương (co giật, trầm cảm, ảo giác, lú lẫn). Kéo dài khoảng QT trên điện tâm đồ (nguy cơ xoắn đỉnh). Nguy cơ phình tách động mạch chủ. Nhạy cảm với ánh sáng (dễ cháy nắng).',
      pregnancy: 'Không nên dùng trong thai kỳ vì nguy cơ gây thoái hóa sụn khớp ở các khớp chịu lực trên động vật non.',
      lactation: 'Ciprofloxacin bài tiết qua sữa mẹ. Không khuyến cáo dùng trong thời kỳ cho con bú, hoặc ngừng cho con bú nếu bắt buộc dùng thuốc.',
      elderly: 'Tăng nguy cơ đứt gân gót và kéo dài khoảng QT ở người cao tuổi, đặc biệt khi dùng kèm corticoid.',
      renalImpairment: 'Cần giảm liều hoặc kéo dài khoảng cách liều khi ClCr < 50 ml/phút.'
    },
    dosageAndAdministration: {
      general: 'Uống trọn viên thuốc với nhiều nước, không nhai nát. Không uống cùng sữa hoặc các sản phẩm từ sữa / bổ sung canxi đơn thuần.',
      adults: 'Nhiễm khuẩn tiết niệu: 250 - 500 mg mỗi 12 giờ trong 7-14 ngày. Nhiễm khuẩn đường hô hấp / xương khớp / nhiễm khuẩn nặng: 500 - 750 mg mỗi 12 giờ. Truyền tĩnh mạch: 200 - 400 mg mỗi 12 giờ (truyền chậm trong 60 phút).',
      children: 'Hạn chế sử dụng ở trẻ em trừ chỉ định đặc biệt (nhiễm khuẩn phổi do P. aeruginosa trong bệnh xơ nang, bệnh than): 10 - 20 mg/kg mỗi 12 giờ (tối đa 750 mg/liều).',
      specialPopulations: 'Suy thận ClCr 30-50 ml/phút: 250-500 mg mỗi 12 giờ; ClCr < 30 ml/phút: 250-500 mg mỗi 18-24 giờ.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Buồn nôn, tiêu chảy', 'Phản ứng tại chỗ tiêm truyền']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Đau đầu, chóng mặt, mất ngủ, bồn chồn', 'Tăng men gan, tăng creatinin máu', 'Phát ban, ngứa, đau khớp']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Viêm gân, đứt gân gót (Achilles)', 'Kéo dài khoảng QT, loạn nhịp tim', 'Co giật, loạn thần, ảo giác, trầm cảm', 'Bệnh lý thần kinh ngoại biên không hồi phục', 'Viêm đại tràng màng giả do C. difficile', 'Nhược cơ nặng lên']
      }
    ],
    drugInteractions: [
      'Thuốc kháng acid chứa Al/Mg, viên sắt, canxi, kẽm, sucralfat: Làm giảm mạnh hấp thu ciprofloxacin. Phải uống cách ciprofloxacin ít nhất 2 giờ trước hoặc 4-6 giờ sau.',
      'Theophyllin: Ciprofloxacin ức chế CYP1A2 làm tăng nồng độ theophyllin máu, dễ gây ngộ độc theophyllin.',
      'Warfarin: Tăng tác dụng chống đông, tăng nguy cơ xuất huyết.',
      'Corticosteroid: Tăng nguy cơ viêm gân và đứt gân, đặc biệt ở người cao tuổi.',
      'Các thuốc làm kéo dài khoảng QT (Amiodaron, Sotalol, Erythromycin, Haloperidol...): Tăng nguy cơ loạn nhịp xoắn đỉnh.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Chóng mặt, run, đau đầu, mệt mỏi, co giật, ảo giác, rối loạn nhịp tim, suy thận cấp do tinh thể niệu.',
      management: 'Rửa dạ dày, cho uống than hoạt. Điều trị triệu chứng, duy trì bù đủ dịch và kiềm hóa nước tiểu để tránh tinh thể niệu. Theo dõi điện tâm đồ. Lọc máu chỉ loại trừ được một lượng nhỏ thuốc.'
    },
    storage: 'Bảo quản ở nhiệt độ phòng dưới 30°C, tránh ánh sáng trực tiếp và ẩm mốc.'
  },
  {
    id: 'metformin',
    vietnameseName: 'Metformin',
    internationalName: 'Metformin hydrochloride',
    atcCode: 'A10BA02',
    pharmacologicalGroup: 'Thuốc hạ đường huyết nhóm Biguanid',
    therapeuticCategory: 'Nội tiết & Chuyển hóa',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nén giải phóng tức thì (IR): 500 mg, 850 mg, 1000 mg',
      'Viên nén giải phóng kéo dài (XR / ER): 500 mg, 750 mg, 1000 mg'
    ],
    pharmacology: {
      mechanism: 'Metformin là thuốc điều trị đái tháo đường nhóm biguanid. Thuốc làm giảm glucose máu bằng cách: (1) ức chế sản xuất glucose ở gan (giảm tân tạo đường và phân giải glycogen); (2) tăng tính nhạy cảm với insulin ở các mô ngoại vi (tăng thu nạp và sử dụng glucose ở cơ xương); (3) làm chậm hấp thu glucose ở ruột. Metformin không kích thích tiết insulin từ tế bào beta đảo tụy, do đó không gây hạ đường huyết khi dùng đơn độc và không gây tăng cân.',
      pharmacokinetics: 'Hấp thu chậm và không hoàn toàn ở ruột non. Sinh khả dụng khoảng 50-60%. Nồng độ đỉnh huyết tương đạt sau 2.5 giờ (viên IR) hoặc 7 giờ (viên XR). Phân bố nhanh vào các mô, hầu như không gắn kết với protein huyết tương. Không bị chuyển hóa ở gan. Đào thải hoàn toàn qua thận ở dạng không biến đổi qua bài tiết ở ống thận. t1/2 khoảng 6.5 giờ.'
    },
    indications: [
      'Điều trị đái tháo đường typ 2 (không phụ thuộc insulin), đặc biệt ở bệnh nhân thừa cân / béo phì khi chế độ ăn và luyện tập không kiểm soát được đường huyết.',
      'Có thể dùng đơn trị liệu hoặc phối hợp với các thuốc hạ đường huyết khác (Sulfonylure, DPP-4i, SGLT-2i, GLP-1 RA, Insulin).',
      'Hội chứng buồng trứng đa nang (PCOS) để cải thiện rụng trứng và giảm đề kháng insulin (chỉ định off-label được đồng thuận).'
    ],
    contraindications: [
      'Quá mẫn với metformin hoặc bất kỳ tá dược nào.',
      'Suy thận nặng với eGFR < 30 ml/phút/1.73 m².',
      'Nhiễm toan chuyển hóa cấp tính hoặc mạn tính, bao gồm nhiễm toan ceton do đái tháo đường, tiền hôn mê do đái tháo đường.',
      'Các tình trạng thiếu oxy cấp tính hoặc sốc: suy tim mất bù, suy hô hấp nặng, nhồi máu cơ tim cấp, nhiễm khuẩn huyết, sốc.',
      'Suy gan nặng, nghiện rượu cấp hoặc mạn tính.',
      'Ngừng thuốc 48 giờ trước và sau khi chụp X-quang có sử dụng thuốc cản quang chứa iod đường tĩnh mạch.'
    ],
    cautions: {
      general: 'Nhiễm toan lactic là biến chứng hiếm gặp nhưng rất nghiêm trọng (tỷ lệ tử vong cao). Cần đánh giá chức năng thận (eGFR) trước khi bắt đầu điều trị và định kỳ hàng năm. Cần ngừng thuốc trước các phẫu thuật lớn có gây mê toàn thân.',
      pregnancy: 'Khi có thai, phụ nữ đái tháo đường nên được chuyển sang điều trị bằng insulin để kiểm soát glucose máu tối ưu.',
      lactation: 'Metformin bài tiết vào sữa mẹ với lượng nhỏ. Có thể dùng trong thời kỳ cho con bú nếu lợi ích vượt trội nguy cơ, theo dõi trẻ cẩn thận.',
      elderly: 'Nguy cơ suy thận và tích lũy metformin dẫn đến toan lactic cao hơn. Cần theo dõi chặt chẽ eGFR.',
      renalImpairment: 'eGFR ≥ 45 - 59: Liều tối đa 2000 mg/ngày, theo dõi thận mỗi 3-6 tháng. eGFR 30 - 44: Liều tối đa 1000 mg/ngày. eGFR < 30: Chống chỉ định tuyệt đối.'
    },
    dosageAndAdministration: {
      general: 'Uống trong hoặc ngay sau bữa ăn để giảm tác dụng không mong muốn trên đường tiêu hóa. Viên XR phải nuốt nguyên viên, không nhai, bẻ hoặc nghiền nát.',
      adults: 'Khởi đầu: 500 mg x 1-2 lần/ngày hoặc 850 mg x 1 lần/ngày. Tăng liều dần sau mỗi 1-2 tuần dựa vào mức glucose máu. Liều duy trì thường dùng: 1500 - 2000 mg/ngày chia làm 2-3 lần. Liều tối đa: 2550 mg/ngày (viên IR) hoặc 2000 mg/ngày (viên XR).',
      children: 'Trẻ em ≥ 10 tuổi: Khởi đầu 500 mg x 1 lần/ngày, tối đa 2000 mg/ngày chia làm 2 lần.',
      specialPopulations: 'Bệnh nhân suy thận: Chỉnh liều theo eGFR như đã nêu.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Rối loạn tiêu hóa: Tiêu chảy, buồn nôn, nôn, đầy hơi, đau bụng, chán ăn (thường tự hết sau vài tuần)', 'Vị kim loại trong miệng']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Giảm hấp thu vitamin B12 khi điều trị dài ngày (gây thiếu máu nguyên hồng cầu khổng lồ hoặc bệnh thần kinh ngoại biên)']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Nhiễm toan acid lactic (nguy hiểm tính mạng)', 'Viêm gan, bất thường xét nghiệm chức năng gan', 'Hồng ban, ngứa, mày đay']
      }
    ],
    drugInteractions: [
      'Thuốc cản quang chứa iod: Tăng nguy cơ suy thận cấp và nhiễm toan lactic. Phải tạm ngừng metformin trước thủ thuật và chỉ dùng lại sau 48 giờ khi chức năng thận bình thường.',
      'Rượu (Alcohol): Tăng nguy cơ nhiễm toan lactic cấp tính, đặc biệt trong trường hợp đói ăn hoặc suy dinh dưỡng.',
      'Thuốc lợi tiểu quai, NSAIDs, thuốc ức chế men chuyển (ACEi/ARB): Có thể làm suy giảm chức năng thận cấp tính dẫn đến tích lũy metformin.',
      'Cimetidin, Dolutegravir: Cạnh tranh bài tiết qua ống thận ở protein vận chuyển cation hữu cơ (OCT), làm tăng nồng độ metformin huyết tương.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Hạ đường huyết hiếm khi xảy ra nhưng có thể xảy ra nhiễm toan lactic. Triệu chứng toan lactic gồm: thở nhanh sâu (Kussmaul), đau bụng dữ dội, hạ thân nhiệt, đau cơ, lơ mơ và hôn mê.',
      management: 'Đây là tình trạng cấp cứu y khoa đe dọa tính mạng. Bệnh nhân phải nhập viện ngay. Phương pháp hiệu quả nhất để loại bỏ metformin và acid lactic là thẩm tách máu (chạy thận nhân tạo).'
    },
    storage: 'Bảo quản nơi khô ráo, nhiệt độ dưới 30°C, tránh ánh sáng.'
  },
  {
    id: 'amlodipine',
    vietnameseName: 'Amlodipin',
    internationalName: 'Amlodipine besylate',
    atcCode: 'C08CA01',
    pharmacologicalGroup: 'Thuốc chẹn kênh calci nhóm Dihydropyridin (DHP thế hệ 2)',
    therapeuticCategory: 'Tim mạch & Huyết áp',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nén / viên nang: 2.5 mg, 5 mg, 10 mg',
      'Viên phối hợp: Amlodipin + Atorvastatin, Amlodipin + Valsartan, Amlodipin + Perindopril'
    ],
    pharmacology: {
      mechanism: 'Amlodipin là dẫn chất dihydropyridin chẹn dòng ion calci đi qua màng tế bào vào cơ trơn mạch máu và cơ tim. Tác dụng chọn lọc trên cơ trơn mạch máu mạnh hơn trên cơ tim. Thuốc làm giãn cơ trơn động mạch ngoại biên, giảm sức cản ngoại vi, từ đó làm giảm huyết áp động mạch. Thuốc cũng làm giãn các tiểu động mạch và động mạch vành, tăng cung cấp oxy cho cơ tim và giảm hậu gánh, giảm nhu cầu oxy cơ tim, phòng ngừa cơn đau thắt ngực.',
      pharmacokinetics: 'Hấp thu chậm và tốt qua đường tiêu hóa, sinh khả dụng đạt 64-90%. Thức ăn không ảnh hưởng đến hấp thu. Nồng độ đỉnh huyết tương đạt sau 6-12 giờ. Thể tích phân bố lớn (khoảng 21 L/kg). Gắn kết protein huyết tương cao (khoảng 97.5%). Chuyển hóa phần lớn qua gan bởi CYP3A4 thành các chất chuyển hóa không hoạt tính. Đào thải chủ yếu qua nước tiểu (60% dạng chuyển hóa, 10% dạng không biến đổi). Thời gian bán thải kéo dài từ 35 - 50 giờ, cho phép dùng 1 lần duy nhất trong ngày.'
    },
    indications: [
      'Tăng huyết áp vô căn (đơn trị liệu hoặc phối hợp với thuốc hạ áp khác như ACEi, ARB, thiazid).',
      'Đau thắt ngực ổn định mạn tính.',
      'Đau thắt ngực do co thắt mạch vành (Đau thắt ngực Prinzmetal).'
    ],
    contraindications: [
      'Quá mẫn với amlodipin, các dẫn chất dihydropyridin khác hoặc bất kỳ tá dược nào.',
      'Hạ huyết áp nặng (huyết áp tâm thu < 90 mmHg).',
      'Sốc tim, hẹp van động mạch chủ nặng.',
      'Suy tim huyết động không ổn định sau nhồi máu cơ tim cấp (trong vòng 28 ngày đầu).'
    ],
    cautions: {
      general: 'Thận trọng ở bệnh nhân suy tim sung huyết (NYHA III-IV) vì có thể tăng biến cố tim mạch. Thuốc có thể gây phù ngoại biên (đặc biệt là phù cổ chân) do giãn tiểu động mạch trước mao mạch chứ không phải do ứ dịch toàn thân.',
      pregnancy: 'Chưa có đủ dữ liệu an toàn trên phụ nữ mang thai. Chỉ sử dụng khi không có lựa chọn thay thế an toàn hơn và bệnh không được kiểm soát.',
      lactation: 'Amlodipin bài tiết vào sữa mẹ. Khuyến cáo cân nhắc giữa lợi ích cho mẹ và nguy cơ cho trẻ bú mẹ.',
      hepaticImpairment: 'Do chuyển hóa chủ yếu qua gan và t1/2 kéo dài, cần khởi đầu với liều thấp (2.5 mg/ngày) ở bệnh nhân suy gan.',
      elderly: 'Độ thanh thải giảm ở người cao tuổi, nên khởi đầu ở liều 2.5 mg/ngày.'
    },
    dosageAndAdministration: {
      general: 'Uống 1 lần/ngày vào bất kỳ thời điểm nào, cùng hoặc không cùng thức ăn. Uống đều đặn vào cùng một thời điểm mỗi ngày.',
      adults: 'Khởi đầu: 5 mg x 1 lần/ngày. Có thể tăng liều lên tối đa 10 mg x 1 lần/ngày sau 1-2 tuần nếu chưa đạt huyết áp mục tiêu. Điều trị đau thắt ngực: 5 - 10 mg x 1 lần/ngày.',
      children: 'Trẻ em 6-17 tuổi bị tăng huyết áp: Khởi đầu 2.5 mg x 1 lần/ngày, tối đa 5 mg x 1 lần/ngày.',
      specialPopulations: 'Người cao tuổi, người suy gan, người thể trạng nhỏ: Khởi đầu 2.5 mg x 1 lần/ngày.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Phù cổ chân, phù chi dưới (liên quan đến liều dùng)', 'Đau đầu, chóng mặt, ngủ gà', 'Đánh trống ngực, bừng mặt đỏ bừng', 'Đau bụng, buồn nôn, khó tiêu, mệt mỏi']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Hạ huyết áp tư thế', 'Rối loạn nhịp tim (nhịp tim chậm, nhịp nhanh thất)', 'Phì đại lợi (viêm lợi phì đại)', 'Chuột rút, đau cơ, run rẩy', 'Trầm cảm, mất ngủ, rối loạn cương dương']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Viêm tụy, viêm gan, vàng da', 'Tăng men gan', 'Hội chứng Stevens-Johnson, viêm mạch']
      }
    ],
    drugInteractions: [
      'Chất ức chế CYP3A4 mạnh (Ketoconazol, Itraconazol, Clarithromycin, Ritonavir): Làm tăng đáng kể nồng độ amlodipin trong máu, tăng nguy cơ hạ huyết áp và phù.',
      'Chất cảm ứng CYP3A4 (Rifampicin, Phenytoin, Carbamazepin, St. John\'s Wort): Làm giảm nồng độ amlodipin huyết tương.',
      'Simvastatin: Dùng đồng thời với amlodipin làm tăng nồng độ simvastatin (giới hạn liều simvastatin tối đa 20 mg/ngày khi dùng cùng amlodipin).',
      'Tacrolimus, Cyclosporin: Amlodipin có thể làm tăng nồng độ tacrolimus/cyclosporin trong máu; cần theo dõi nồng độ thuốc đáy trong máu.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Giãn mạch ngoại vi quá mức dẫn đến hạ huyết áp nặng kéo dài, nhịp tim nhanh phản xạ hoặc nhịp tim chậm, sốc tim, phù phổi không do tim.',
      management: 'Theo dõi tim mạch tích cực tại ICU. Nâng cao chân, truyền dịch tĩnh mạch. Nếu hạ huyết áp không đáp ứng, dùng thuốc vận mạch (noradrenalin, dopamin). Tiêm tĩnh mạch calci gluconat để đảo ngược tác dụng chẹn kênh calci. Rửa dạ dày và than hoạt nếu mới uống trong 2 giờ.'
    },
    storage: 'Bảo quản nơi khô ráo dưới 30°C, tránh ánh sáng trực tiếp.'
  },
  {
    id: 'omeprazole',
    vietnameseName: 'Omeprazol',
    internationalName: 'Omeprazole',
    atcCode: 'A02BC01',
    pharmacologicalGroup: 'Thuốc ức chế bơm proton (PPI)',
    therapeuticCategory: 'Tiêu hóa & Dạ dày',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nang / nén bao tan trong ruột: 10 mg, 20 mg, 40 mg',
      'Bột pha tiêm truyền tĩnh mạch: 40 mg'
    ],
    pharmacology: {
      mechanism: 'Omeprazol là dẫn chất benzimidazol thay thế, ức chế đặc hiệu và không hồi phục enzym H+/K+-ATPase (bơm proton) ở màng tế bào viền dạ dày. Thuốc là tiền chất (prodrug), sau khi hấp thu vào máu sẽ đến tế bào viền dạ dày, được hoạt hóa trong môi trường acid thành dẫn chất sulfenamid gắn kết đồng hóa trị với nhóm sulfhydryl của bơm proton, ức chế cả sự tiết acid cơ bản và sự tiết acid do bất kỳ kích thích nào. Tác dụng ức chế kéo dài đến 24-72 giờ mặc dù t1/2 huyết tương ngắn.',
      pharmacokinetics: 'Omeprazol không bền trong môi trường acid nên phải bào chế dưới dạng bao tan trong ruột. Hấp thu ở ruột non, sinh khả dụng khoảng 30-40% (tăng lên 60% sau liều lặp lại). Nồng độ đỉnh huyết tương đạt sau 0.5-3.5 giờ. Gắn kết protein huyết tương khoảng 95%. Chuyển hóa hoàn toàn ở gan qua CYP2C19 và CYP3A4 thành các chất không hoạt tính. Đào thải chủ yếu qua nước tiểu (khoảng 80%) và qua phân. t1/2 khoảng 0.5 - 1 giờ.'
    },
    indications: [
      'Bệnh trào ngược dạ dày - thực quản (GERD): Điều trị viêm thực quản trào ngược trợt loét và điều trị triệu chứng ợ nóng.',
      'Loét dạ dày - tá tràng lành tính tiến triển.',
      'Phối hợp kháng sinh tiệt trừ Helicobacter pylori trong bệnh loét dạ dày tá tràng.',
      'Phòng và điều trị loét dạ dày - tá tràng do thuốc chống viêm không steroid (NSAIDs).',
      'Hội chứng Zollinger-Ellison (tăng tiết acid quá mức).',
      'Dự phòng xuất huyết tiêu hóa do loét do stress ở bệnh nhân hồi sức tích cực.'
    ],
    contraindications: [
      'Quá mẫn với omeprazol, các dẫn chất benzimidazol thay thế khác (esomeprazol, pantoprazol, lansoprazol, rabeprazol) hoặc bất kỳ tá dược nào.',
      'Dùng đồng thời với nelfinavir (thuốc điều trị HIV).'
    ],
    cautions: {
      general: 'Cần loại trừ khả năng ung thư dạ dày trước khi điều trị vì omeprazol có thể che lấp các triệu chứng làm chậm chẩn đoán. Dùng PPI kéo dài (> 1 năm) có thể làm tăng nhẹ nguy cơ gãy xương (háng, cổ tay, cột sống), hạ magnesi máu nặng, thiếu hụt vitamin B12, viêm thận kẽ cấp, và nhiễm khuẩn đường ruột (Clostridioides difficile, Salmonella, Campylobacter).',
      pregnancy: 'Dữ liệu trên phụ nữ mang thai không cho thấy dị tật hoặc độc tính thai nhi. Có thể sử dụng omeprazol trong thai kỳ nếu cần thiết.',
      lactation: 'Omeprazol bài tiết vào sữa mẹ với lượng nhỏ nhưng dường như không ảnh hưởng đến trẻ bú mẹ ở liều điều trị.',
      hepaticImpairment: 'Ở bệnh nhân suy gan, sinh khả dụng tăng và t1/2 kéo dài đến khoảng 3 giờ. Khuyến cáo liều tối đa 20 mg/ngày.'
    },
    dosageAndAdministration: {
      general: 'Nên uống thuốc vào buổi sáng, trước bữa ăn 30 - 60 phút. Nuốt nguyên viên nang/nén với nước, không nhai hoặc nghiền nát hạt vi bao.',
      adults: 'Loét tá tràng: 20 mg x 1 lần/ngày trong 2-4 tuần. Loét dạ dày / Viêm thực quản trào ngược: 20 - 40 mg x 1 lần/ngày trong 4-8 tuần. Tiệt trừ H. pylori: 20 mg x 2 lần/ngày trong 14 ngày (phối hợp kháng sinh). Hội chứng Zollinger-Ellison: Khởi đầu 60 mg/ngày, điều chỉnh theo đáp ứng (20-120 mg/ngày). Tiêm tĩnh mạch: 40 mg x 1 lần/ngày (tiêm chậm trong 5 phút hoặc truyền 20-30 phút).',
      children: 'Trẻ em ≥ 1 tuổi (10-20 kg): 10 mg x 1 lần/ngày. Trẻ > 20 kg: 20 mg x 1 lần/ngày.',
      specialPopulations: 'Bệnh nhân suy gan: tối đa 20 mg/ngày.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Nhức đầu, chóng mặt', 'Tiêu chảy, táo bón, đau bụng, buồn nôn, đầy hơi', 'Polyp tuyến đáy vị lành tính']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Mất ngủ, dị cảm, ngủ gà', 'Tăng men gan thoáng qua', 'Phát ban da, ngứa, mày đay', 'Gãy xương khi dùng liều cao dài ngày']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Hạ magnesi máu nặng, hạ calci máu, hạ kali máu', 'Viêm thận kẽ cấp tính', 'Nhiễm khuẩn đường ruột Clostridioides difficile', 'Giảm bạch cầu, giảm tiểu cầu', 'Hội chứng Stevens-Johnson, hoại tử biểu bì']
      }
    ],
    drugInteractions: [
      'Clopidogrel: Omeprazol ức chế CYP2C19 làm giảm chuyển hóa clopidogrel thành dạng có hoạt tính, giảm tác dụng chống kết tập tiểu cầu. Khuyên dùng pantoprazol thay thế.',
      'Thuốc hấp thu phụ thuộc pH dạ dày (Ketoconazol, Itraconazol, Atazanavir, Erlotinib, Sắt): Omeprazol làm tăng pH dạ dày làm giảm hấp thu các thuốc này.',
      'Diazepam, Phenytoin, Warfarin: Omeprazol ức chế CYP2C19 làm chậm thải trừ và tăng nồng độ các thuốc này trong máu.',
      'Methotrexat: Dùng cùng PPI liều cao có thể làm tăng nồng độ methotrexat, dẫn đến tăng độc tính.',
      'Digoxin: Tăng sinh khả dụng và nồng độ digoxin trong máu do tăng pH dạ dày.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Triệu chứng quá liều thường nhẹ: buồn ngủ, lơ mơ, mờ mắt, nhịp tim nhanh, buồn nôn, toát mồ hôi, đỏ bừng, khô miệng.',
      management: 'Chủ yếu điều trị triệu chứng và nâng đỡ. Omeprazol gắn kết protein huyết tương cao nên không thể loại bỏ bằng thẩm tách máu.'
    },
    storage: 'Bảo quản nơi khô ráo, nhiệt độ dưới 30°C, tránh ẩm và ánh sáng trực tiếp.'
  },
  {
    id: 'atorvastatin',
    vietnameseName: 'Atorvastatin',
    internationalName: 'Atorvastatin calcium',
    atcCode: 'C10AA05',
    pharmacologicalGroup: 'Thuốc hạ lipid máu nhóm Statin (Ức chế HMG-CoA Reductase)',
    therapeuticCategory: 'Tim mạch & Chuyển hóa',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Viên nén bao phim: 10 mg, 20 mg, 40 mg, 80 mg'
    ],
    pharmacology: {
      mechanism: 'Atorvastatin là chất ức chế cạnh tranh và chọn lọc enzym HMG-CoA reductase - enzym xúc tác bước quyết định tốc độ trong quá trình sinh tổng hợp cholesterol từ HMG-CoA thành mevalonat. Việc ức chế này làm giảm tổng hợp cholesterol ở gan, dẫn đến tăng biểu hiện thụ thể LDL trên bề mặt tế bào gan, tăng thanh thải LDL-cholesterol (LDL-C) từ tuần hoàn. Thuốc làm giảm LDL-C, Apolipoprotein B, Triglycerid và làm tăng nhẹ HDL-C. Ngoài ra thuốc còn có tác dụng cải thiện chức năng nội mô, chống viêm mảng xơ vữa và ổn định mảng xơ vữa động mạch.',
      pharmacokinetics: 'Hấp thu nhanh sau khi uống, nồng độ đỉnh đạt sau 1-2 giờ. Sinh khả dụng tuyệt đối khoảng 14% do chuyển hóa bước đầu qua gan nhiều. Gắn kết protein huyết tương rất cao (≥ 98%). Chuyển hóa chủ yếu qua CYP3A4 thành các chất chuyển hóa ortho- và parahydroxyl hóa có hoạt tính (chiếm 70% hoạt tính ức chế HMG-CoA reductase). Đào thải chủ yếu qua mật và phân (dưới 2% qua nước tiểu). t1/2 của atorvastatin khoảng 14 giờ, nhưng thời gian bán thải hoạt tính ức chế HMG-CoA reductase lên đến 20-30 giờ.'
    },
    indications: [
      'Tăng cholesterol máu nguyên phát (dị hợp tử có hoặc không có tính gia đình) và rối loạn lipid máu hỗn hợp (Fredrickson typ IIa và IIb).',
      'Tăng triglycerid máu (Fredrickson typ IV) và rối loạn beta-lipoprotein máu (Fredrickson typ III).',
      'Tăng cholesterol máu đồng hợp tử có tính gia đình (kết hợp với các liệu pháp hạ lipid khác).',
      'Dự phòng tiên phát biến cố tim mạch ở bệnh nhân có nguy cơ tim mạch cao (tăng huyết áp, đái tháo đường, hút thuốc, tuổi cao).',
      'Dự phòng thứ phát biến cố tim mạch (nhồi máu cơ tim, đột quỵ, tái thông mạch vành) ở bệnh nhân đã có bệnh mạch vành rõ trên lâm sàng.'
    ],
    contraindications: [
      'Quá mẫn với atorvastatin hoặc bất kỳ thành phần nào của thuốc.',
      'Bệnh gan tiến triển hoặc tăng men gan huyết thanh dai dẳng không rõ nguyên nhân (vượt quá 3 lần giới hạn trên bình thường - ULN).',
      'Phụ nữ có thai và phụ nữ đang cho con bú.',
      'Dùng đồng thời với thuốc kháng virus viêm gan C (Glecaprevir/Pibrentasvir).'
    ],
    cautions: {
      general: 'Cần làm xét nghiệm enzym gan (AST, ALT) trước khi bắt đầu điều trị và định kỳ khi có chỉ định lâm sàng. Cần cảnh báo bệnh nhân báo cáo ngay các triệu chứng đau cơ, yếu cơ không rõ nguyên nhân. Nguy cơ bệnh cơ và tiêu cơ vân (rhabdomyolysis) dẫn đến suy thận cấp tăng lên khi dùng liều cao hoặc phối hợp với các thuốc ức chế CYP3A4, fibrat (gemfibrozil). Có thể làm tăng nhẹ đường huyết đói và HbA1c.',
      pregnancy: 'Chống chỉ định tuyệt đối trong thai kỳ. Cholesterol cần thiết cho sự phát triển bình thường của thai nhi. Phụ nữ độ tuổi sinh sản phải dùng biện pháp tránh thai hiệu quả.',
      lactation: 'Chống chỉ định trong thời kỳ cho con bú do nguy cơ tiềm ẩn tác dụng không mong muốn nghiêm trọng ở trẻ sơ sinh.',
      hepaticImpairment: 'Chống chỉ định ở bệnh nhân bệnh gan hoạt động. Nồng độ thuốc tăng đáng kể ở bệnh nhân suy gan do rượu mạn tính.'
    },
    dosageAndAdministration: {
      general: 'Uống 1 lần duy nhất trong ngày vào bất kỳ thời điểm nào (sáng hoặc tối), cùng hoặc không cùng thức ăn.',
      adults: 'Khởi đầu thông thường: 10 - 20 mg x 1 lần/ngày. Với bệnh nhân cần giảm LDL-C nhiều (> 45%): khởi đầu 40 mg x 1 lần/ngày. Khoảng liều điều trị: 10 - 80 mg x 1 lần/ngày. Đánh giá lại lipid máu sau 2-4 tuần để điều chỉnh liều.',
      children: 'Trẻ em ≥ 10 tuổi bị tăng cholesterol máu dị hợp tử gia đình: Khởi đầu 10 mg/ngày, tối đa 20 mg/ngày.',
      specialPopulations: 'Không cần chỉnh liều ở bệnh nhân suy thận.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Đau cơ, co cứng cơ, đau khớp, đau lưng', 'Viêm mũi họng, đau hầu họng, chảy máu cam', 'Táo bón, đầy hơi, khó tiêu, buồn nôn, tiêu chảy', 'Tăng đường huyết nhẹ, tăng men gan']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Hạ đường huyết, chán ăn, tăng cân', 'Ác mộng, mất ngủ, chóng mặt, dị cảm', 'Ù tai, mờ mắt', 'Viêm gan, mày đay, rụng tóc']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Bệnh cơ, viêm cơ, tiêu cơ vân (tăng creatin kinase CK > 10 lần ULN), myoglobin niệu và suy thận cấp', 'Bệnh cơ hoại tử qua trung gian miễn dịch (IMNM)', 'Sưng mạch thần kinh, viêm tụy']
      }
    ],
    drugInteractions: [
      'Chất ức chế CYP3A4 mạnh (Ketoconazol, Itraconazol, Clarithromycin, Erythromycin, thuốc ức chế protease HIV, Cobicistat): Làm tăng mạnh nồng độ atorvastatin, tăng nguy cơ tiêu cơ vân.',
      'Cyclosporin: Làm tăng nồng độ atorvastatin lên nhiều lần (tránh dùng chung hoặc giới hạn atorvastatin tối đa 10 mg/ngày).',
      'Gemfibrozil / Các Fibrat: Tăng nguy cơ bệnh cơ và tiêu cơ vân nặng khi dùng phối hợp.',
      'Nước ép bưởi chùm (Grapefruit juice): Uống lượng lớn (> 1.2 lít/ngày) ức chế CYP3A4 làm tăng nồng độ atorvastatin.',
      'Digoxin: Dùng đồng thời với atorvastatin 80 mg làm tăng nhẹ nồng độ digoxin máu.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Không có triệu chứng quá liều đặc hiệu.',
      management: 'Chủ yếu điều trị triệu chứng và các biện pháp hồi sức nâng đỡ. Theo dõi enzym gan và creatin kinase (CK). Do atorvastatin gắn kết protein huyết tương cao, thẩm tách máu không có hiệu quả đào thải thuốc.'
    },
    storage: 'Bảo quản nơi khô ráo, nhiệt độ dưới 30°C, tránh ánh sáng.'
  },
  {
    id: 'ceftriaxone',
    vietnameseName: 'Ceftriaxon',
    internationalName: 'Ceftriaxone sodium',
    atcCode: 'J01DD04',
    pharmacologicalGroup: 'Kháng sinh Cephalosporin thế hệ 3',
    therapeuticCategory: 'Kháng sinh & Chống nhiễm khuẩn',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Lọ bột pha tiêm bắp / tiêm tĩnh mạch / truyền tĩnh mạch: 500 mg, 1 g, 2 g'
    ],
    pharmacology: {
      mechanism: 'Ceftriaxon là kháng sinh cephalosporin bán tổng hợp thế hệ 3, có hoạt phổ kháng khuẩn rộng và tác dụng diệt khuẩn. Cơ chế diệt khuẩn là do ức chế tổng hợp thành tế bào vi khuẩn thông qua gắn kết với các protein gắn penicillin (PBPs). Bền vững cao với đa số các enzym beta-lactamase (cả penicillinase và cephalosporinase) của vi khuẩn Gram âm và Gram dương.',
      pharmacokinetics: 'Sau khi tiêm bắp hoặc tiêm tĩnh mạch 1 g, nồng độ đỉnh huyết tương đạt khoảng 80-150 mg/L. Phân bố rất tốt vào hầu hết các mô và dịch cơ thể bao gồm dịch não tủy (đặc biệt khi màng não bị viêm), dịch màng phổi, dịch màng bụng, xương, mật. Gắn kết protein huyết tương từ 85 - 95%. Không bị chuyển hóa trong cơ thể. Khoảng 50-60% liều dùng đào thải qua thận dưới dạng không đổi, phần còn lại (40-50%) đào thải qua mật vào phân. t1/2 kéo dài khoảng 8 giờ ở người lớn khỏe mạnh, cho phép dùng 1 lần/ngày.'
    },
    indications: [
      'Viêm màng não mủ do vi khuẩn (Streptococcus pneumoniae, Neisseria meningitidis, Haemophilus influenzae).',
      'Nhiễm khuẩn huyết và sốc nhiễm khuẩn.',
      'Viêm phổi mắc phải tại cộng đồng nặng (CAP) và viêm phổi bệnh viện.',
      'Nhiễm khuẩn ổ bụng phức tạp (viêm phúc mạc, nhiễm khuẩn đường mật).',
      'Nhiễm khuẩn đường tiết niệu có biến chứng và viêm đài bể thận.',
      'Nhiễm khuẩn xương khớp và mô mềm nặng.',
      'Bệnh lậu không biến chứng (viêm niệu đạo, viêm cổ tử cung do Neisseria gonorrhoeae).',
      'Bệnh Lyme giai đoạn muộn (tổn thương thần kinh, tim mạch).',
      'Dự phòng nhiễm khuẩn phẫu thuật.'
    ],
    contraindications: [
      'Quá mẫn với ceftriaxon hoặc bất kỳ kháng sinh nhóm cephalosporin nào.',
      'Tiền sử sốc phản vệ hoặc phản ứng dị ứng tức thì nghiêm trọng với bất kỳ beta-lactam nào khác.',
      'Trẻ sơ sinh thiếu tháng (đến 41 tuần tuổi thai cộng tuần tuổi sau sinh).',
      'Trẻ sơ sinh đủ tháng (≤ 28 ngày tuổi) bị tăng bilirubin máu hoặc vàng da (nguy cơ bệnh não do bilirubin).',
      'Dùng đồng thời với các dung dịch chứa calci ở trẻ sơ sinh (≤ 28 ngày tuổi) kể cả truyền qua các đường truyền khác nhau do nguy cơ lắng đọng tủa calci-ceftriaxon ở phổi và thận.'
    ],
    cautions: {
      general: 'Không được trộn lẫn hoặc dùng đồng thời với dung dịch tiêm truyền chứa calci (như Ringer Lactat, dung dịch nuôi dưỡng ngoài đường tiêu hóa TPN) qua cùng một đường truyền ở bất kỳ lứa tuổi nào. Thận trọng nguy cơ sỏi bùn mật (bùn mật giả do kết tủa muối calci-ceftriaxon trong túi mật), thường hồi phục khi ngưng thuốc. Nguy cơ viêm đại tràng giả mạc C. difficile.',
      pregnancy: 'Ceftriaxon qua được hàng rào nhau thai. Các nghiên cứu trên động vật không cho thấy độc tính sinh sản. Có thể dùng trong thai kỳ khi có chỉ định rõ ràng.',
      lactation: 'Bài tiết vào sữa mẹ với nồng độ thấp. Cần thận trọng khi dùng cho phụ nữ đang cho con bú.',
      hepaticImpairment: 'Không cần chỉnh liều nếu chức năng thận bình thường.',
      renalImpairment: 'Không cần chỉnh liều nếu chức năng gan bình thường, trừ khi suy thận nặng (ClCr < 10 ml/phút) liều không quá 2 g/ngày.'
    },
    dosageAndAdministration: {
      general: 'Tiêm bắp sâu (pha với lidocain 1%), tiêm tĩnh mạch chậm trong 2-4 phút hoặc truyền tĩnh mạch trong ít nhất 30 phút.',
      adults: 'Nhiễm khuẩn thông thường: 1 - 2 g x 1 lần/ngày (hoặc chia làm 2 lần/ngày). Nhiễm khuẩn nặng / Viêm màng não: 2 g mỗi 12 giờ (tổng liều 4 g/ngày). Bệnh lậu không biến chứng: 500 mg tiêm bắp liều duy nhất. Dự phòng phẫu thuật: 1 - 2 g tiêm 30-90 phút trước rạch da.',
      children: 'Trẻ em > 28 ngày tuổi: 50 - 80 mg/kg/ngày x 1 lần/ngày. Viêm màng não mủ: Khởi đầu 100 mg/kg (tối đa 4 g), sau đó 100 mg/kg/ngày x 1 lần/ngày (tối đa 4 g/ngày).',
      specialPopulations: 'Suy gan kết hợp suy thận nặng: Giám sát nồng độ thuốc trong máu và không dùng quá 2 g/ngày.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Tiêu chảy, phân lỏng', 'Tăng bạch cầu ái toan, giảm bạch cầu', 'Tăng men gan AST, ALT, tăng phosphatase kiềm', 'Đau hoặc viêm tĩnh mạch tại chỗ tiêm']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Buồn nôn, nôn', 'Nhiễm nấm đường sinh dục, phát ban, ngứa', 'Tăng creatinin máu, giảm tiểu cầu, đau đầu, chóng mặt']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Sốc phản vệ, phù mạch', 'Viêm đại tràng màng giả do C. difficile', 'Hội chứng bùn túi mật giả (kết tủa calci-ceftriaxon)', 'Thiếu máu tán huyết tự miễn dịch', 'Hội chứng Stevens-Johnson (SJS), TEN']
      }
    ],
    drugInteractions: [
      'Dung dịch chứa calci (Ringer Lactat, Hartmann, TPN): Tạo tủa muối calci-ceftriaxon gây tắc mạch và lắng đọng tại phổi, thận.',
      'Thuốc chống đông máu (Warfarin): Ceftriaxon có thể làm tăng tác dụng chống đông và tăng nguy cơ chảy máu do ức chế tổng hợp vitamin K của vi khuẩn ruột.',
      'Thuốc lợi tiểu quai liều cao, Aminoglycosid: Tăng nguy cơ độc tính thận khi dùng phối hợp.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Kích thích thần kinh cơ, co giật có thể xảy ra khi dùng liều quá cao, đặc biệt ở bệnh nhân suy thận.',
      management: 'Điều trị triệu chứng và hồi sức. Dùng thuốc chống co giật (diazepam) nếu có co giật. Thẩm phân máu hoặc thẩm phân phúc mạc không làm giảm đáng kể nồng độ thuốc.'
    },
    storage: 'Bảo quản bột vô khuẩn ở nhiệt độ dưới 30°C, tránh ánh sáng. Dung dịch sau pha tiêm nên dùng ngay.'
  },
  {
    id: 'salbutamol',
    vietnameseName: 'Salbutamol (Albuterol)',
    internationalName: 'Salbutamol (Albuterol)',
    atcCode: 'R03AC02',
    pharmacologicalGroup: 'Thuốc kích thích chọn lọc thụ thể beta-2 adrenergic tác dụng ngắn (SABA)',
    therapeuticCategory: 'Hô hấp & Hen phế quản',
    edition: 'Dược thư Quốc gia Việt Nam III',
    dosageForms: [
      'Bình xịt định liều (MDI): 100 mcg/nhát xịt (200 liều)',
      'Dung dịch khí dung (Nebulizer): 2.5 mg/2.5ml, 5 mg/2.5ml',
      'Viên nén / nang: 2 mg, 4 mg',
      'Siro uống: 2 mg/5ml',
      'Dung dịch tiêm: 0.5 mg/ml'
    ],
    pharmacology: {
      mechanism: 'Salbutamol là chất chủ vận chọn lọc trên thụ thể beta-2 adrenergic ở cơ trơn phế quản. Khi gắn vào thụ thể beta-2, thuốc kích thích adenyl cyclase chuyển ATP thành AMP vòng (cAMP), hoạt hóa protein kinase A dẫn đến giảm nồng độ calci nội bào, gây giãn cơ trơn đường hô hấp từ khí quản đến các tiểu phế quản tận cùng. Thuốc cũng ức chế giải phóng các chất trung gian hóa học gây co thắt phế quản từ dưỡng bào (mast cells) ở phổi và làm tăng độ thanh thải nhầy nhung mao.',
      pharmacokinetics: 'Khi dùng đường hít, chỉ khoảng 10-20% liều hít vào được đến đường hô hấp dưới, phần còn lại đọng ở hầu họng và nuốt vào đường tiêu hóa. Tác dụng giãn phế quản xuất hiện nhanh sau 5 phút, đạt tối đa sau 30-60 phút và kéo dài 4-6 giờ. Chuyển hóa chủ yếu ở gan thành dẫn chất sulfat không hoạt tính. Thải trừ qua nước tiểu trong vòng 72 giờ. t1/2 khoảng 4 - 6 giờ.'
    },
    indications: [
      'Cắt cơn co thắt phế quản cấp trong bệnh hen phế quản và bệnh phổi tắc nghẽn mạn tính (COPD).',
      'Dự phòng co thắt phế quản do gắng sức hoặc do tiếp xúc với dị nguyên.',
      'Điều trị đợt cấp nặng của hen phế quản (dùng đường khí dung hoặc tiêm truyền tĩnh mạch).',
      'Dọa sẩy thai / Dọa đẻ non trong sản khoa (chỉ định tiêm truyền đặc biệt để giảm co bóp tử cung).',
      'Tăng kali máu cấp tính (điều trị hỗ trợ khẩn cấp bằng khí dung liều cao).'
    ],
    contraindications: [
      'Quá mẫn với salbutamol hoặc bất kỳ tá dược nào.',
      'Dọa sẩy thai trong 6 tháng đầu thai kỳ.',
      'Không dùng dạng hít/uống để điều trị dọa đẻ non.'
    ],
    cautions: {
      general: 'Không nên lạm dụng SABA đơn độc trong điều trị hen mạn tính vì không điều trị được tình trạng viêm nền (cần phối hợp ICS). Thận trọng ở bệnh nhân cường giáp, bệnh tim thiếu máu cục bộ, loạn nhịp tim, tăng huyết áp nặng, đái tháo đường (nguy cơ tăng đường huyết và toan ceton). Thuốc có thể gây hạ kali máu nghiêm trọng khi dùng liều cao.',
      pregnancy: 'Thuốc qua được nhau thai. Đã được sử dụng rộng rãi và an toàn trong nhiều năm cho phụ nữ mang thai bị hen phế quản. Khuyến cáo dùng đường hít tại chỗ để giảm phơi nhiễm toàn thân.',
      lactation: 'Salbutamol bài tiết vào sữa mẹ. Cần cân nhắc giữa lợi ích cho mẹ và nguy cơ cho trẻ bú mẹ.',
      elderly: 'Người cao tuổi dễ nhạy cảm hơn với tác dụng phụ tim mạch (đánh trống ngực, run rẩy, hạ kali máu).'
    },
    dosageAndAdministration: {
      general: 'Dạng hít định liều (MDI) nên sử dụng buồng đệm (spacer) để tăng lượng thuốc vào phổi.',
      adults: 'Cắt cơn hen cấp: Xịt 1 - 2 nhát (100 - 200 mcg). Nếu không đỡ có thể lặp lại sau vài phút. Dự phòng hen do gắng sức: Xịt 2 nhát (200 mcg) trước khi vận động 10-15 phút. Khí dung đợt cấp: 2.5 - 5 mg khí dung mỗi 4-6 giờ hoặc liên tục trong cơn hen ác tính. Đường uống: 2 - 4 mg x 3-4 lần/ngày.',
      children: 'Trẻ em: Xịt 1 nhát (100 mcg) khi có cơn, có thể tăng lên 2 nhát. Khí dung: 0.15 mg/kg (tối thiểu 1.25 mg, tối đa 5 mg) mỗi 4-6 giờ. Đường uống: 1 - 2 mg x 3-4 lần/ngày.'
    },
    adverseReactions: [
      {
        frequency: 'Thường gặp (ADR > 1/100)',
        effects: ['Run nhẹ cơ vân (đặc biệt là bàn tay)', 'Đau đầu, bồn chồn, lo âu', 'Nhịp tim nhanh, đánh trống ngực']
      },
      {
        frequency: 'Ít gặp (1/1000 < ADR < 1/100)',
        effects: ['Hạ kali máu (đặc biệt khi dùng liều cao hoặc phối hợp corticoid/lợi tiểu)', 'Kích ứng miệng và họng, ho', 'Chuột rút cơ']
      },
      {
        frequency: 'Hiếm gặp (ADR < 1/1000)',
        effects: ['Co thắt phế quản nghịch ngôn (paradoxical bronchospasm) đe dọa tính mạng', 'Loạn nhịp tim (rung nhĩ, nhịp nhanh trên thất, ngoại tâm thu)', 'Giãn mạch ngoại vi, hạ huyết áp', 'Tăng glucose máu']
      }
    ],
    drugInteractions: [
      'Thuốc chẹn beta không chọn lọc (Propranolol, Timolol, Nadolol): Đối kháng hoàn toàn tác dụng của salbutamol và có thể gây co thắt phế quản nặng đe dọa tính mạng ở người hen.',
      'Thuốc lợi tiểu hạ kali (Furosemid, Thiazid) và Corticoid: Làm tăng nguy cơ hạ kali máu nặng.',
      'Thuốc ức chế MAO (MAOIs) và thuốc chống trầm cảm 3 vòng (TCAs): Tăng tác dụng trên hệ tim mạch của salbutamol, tăng nguy cơ loạn nhịp và tăng huyết áp.',
      'Digoxin: Salbutamol có thể làm giảm nồng độ digoxin trong huyết tương.'
    ],
    toxicityAndOverdose: {
      symptoms: 'Run dữ dội, bồn chồn, nhịp tim nhanh kịch phát, loạn nhịp tim, đánh trống ngực, hạ huyết áp hoặc tăng huyết áp, hạ kali máu nặng, tăng acid lactic máu.',
      management: 'Ngừng dùng thuốc ngay. Rửa dạ dày và than hoạt nếu uống. Theo dõi điện tâm đồ và điện giải đồ (đặc biệt là kali máu). Thuốc giải độc ưu tiên khi có triệu chứng tim mạch nặng là thuốc chẹn chọn lọc thụ thể beta-1 (như metoprolol, atenolol), tuy nhiên phải hết sức thận trọng vì có thể gây co thắt phế quản.'
    },
    storage: 'Bảo quản bình xịt dưới 30°C, tránh ánh nắng trực tiếp và nhiệt độ cao, không chọc thủng hoặc đốt bình xịt ngay cả khi đã hết thuốc.'
  }
];
