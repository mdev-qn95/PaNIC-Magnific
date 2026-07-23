-- Seed các kinh phổ biến (is_seed = true — người dùng nhân bản để sửa, bản gốc giữ nguyên)
-- Chạy sau schema.sql

insert into prayers (title, content_raw, slides, is_seed) values

('Kinh Lạy Cha',
'Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng, nước Cha trị đến, ý Cha thể hiện dưới đất cũng như trên trời.
Xin Cha cho chúng con hôm nay lương thực hằng ngày, và tha nợ chúng con, như chúng con cũng tha kẻ có nợ chúng con. Xin chớ để chúng con sa chước cám dỗ, nhưng cứu chúng con cho khỏi sự dữ. Amen.',
'[{"lines":["Lạy Cha chúng con ở trên trời,","chúng con nguyện danh Cha cả sáng,","nước Cha trị đến, ý Cha thể hiện","dưới đất cũng như trên trời."]},{"lines":["Xin Cha cho chúng con hôm nay lương thực hằng ngày,","và tha nợ chúng con, như chúng con","cũng tha kẻ có nợ chúng con.","Xin chớ để chúng con sa chước cám dỗ,"]},{"lines":["nhưng cứu chúng con cho khỏi sự dữ. Amen."]}]'::jsonb,
true),

('Kinh Kính Mừng',
'Kính mừng Maria đầy ơn phúc, Đức Chúa Trời ở cùng Bà, Bà có phúc lạ hơn mọi người nữ, và Giêsu con lòng Bà gồm phúc lạ.
Thánh Maria Đức Mẹ Chúa Trời, cầu cho chúng con là kẻ có tội, khi nay và trong giờ lâm tử. Amen.',
'[{"lines":["Kính mừng Maria đầy ơn phúc,","Đức Chúa Trời ở cùng Bà,","Bà có phúc lạ hơn mọi người nữ,","và Giêsu con lòng Bà gồm phúc lạ."]},{"lines":["Thánh Maria Đức Mẹ Chúa Trời,","cầu cho chúng con là kẻ có tội,","khi nay và trong giờ lâm tử. Amen."]}]'::jsonb,
true),

('Kinh Sáng Danh',
'Sáng danh Đức Chúa Cha và Đức Chúa Con và Đức Chúa Thánh Thần. Như đã có trước vô cùng, và bây giờ, và hằng có, và đời đời chẳng cùng. Amen.',
'[{"lines":["Sáng danh Đức Chúa Cha và Đức Chúa Con","và Đức Chúa Thánh Thần.","Như đã có trước vô cùng, và bây giờ,","và hằng có, và đời đời chẳng cùng. Amen."]}]'::jsonb,
true),

('Kinh Tin Kính (Các Thánh Tông Đồ)',
'Tôi tin kính Đức Chúa Trời là Cha phép tắc vô cùng dựng nên trời đất.
Tôi tin kính Đức Chúa Giêsu Kitô là Con Một Đức Chúa Cha cùng là Chúa chúng tôi; bởi phép Đức Chúa Thánh Thần mà Người xuống thai, sinh bởi Bà Maria đồng trinh: chịu nạn đời quan Phongxiô Philatô, chịu đóng đanh trên cây Thánh giá, chết và táng xác; xuống ngục tổ tông, ngày thứ ba bởi trong kẻ chết mà sống lại; lên trời ngự bên hữu Đức Chúa Cha phép tắc vô cùng; ngày sau bởi trời lại xuống phán xét kẻ sống và kẻ chết.
Tôi tin kính Đức Chúa Thánh Thần. Tôi tin có Hội Thánh hằng có ở khắp thế này, các thánh thông công. Tôi tin phép tha tội. Tôi tin xác loài người ngày sau sống lại. Tôi tin hằng sống vậy. Amen.',
'[{"lines":["Tôi tin kính Đức Chúa Trời","là Cha phép tắc vô cùng","dựng nên trời đất."]},{"lines":["Tôi tin kính Đức Chúa Giêsu Kitô","là Con Một Đức Chúa Cha cùng là Chúa chúng tôi;","bởi phép Đức Chúa Thánh Thần mà Người xuống thai,","sinh bởi Bà Maria đồng trinh:"]},{"lines":["chịu nạn đời quan Phongxiô Philatô,","chịu đóng đanh trên cây Thánh giá,","chết và táng xác; xuống ngục tổ tông,","ngày thứ ba bởi trong kẻ chết mà sống lại;"]},{"lines":["lên trời ngự bên hữu Đức Chúa Cha","phép tắc vô cùng; ngày sau bởi trời","lại xuống phán xét kẻ sống và kẻ chết."]},{"lines":["Tôi tin kính Đức Chúa Thánh Thần.","Tôi tin có Hội Thánh hằng có ở khắp thế này,","các thánh thông công. Tôi tin phép tha tội."]},{"lines":["Tôi tin xác loài người ngày sau sống lại.","Tôi tin hằng sống vậy. Amen."]}]'::jsonb,
true),

('Kinh Cáo Mình',
'Tôi thú nhận cùng Thiên Chúa toàn năng, và cùng anh chị em: tôi đã phạm tội nhiều trong tư tưởng, lời nói, việc làm, và những điều thiếu sót: lỗi tại tôi, lỗi tại tôi, lỗi tại tôi mọi đàng.
Vì vậy tôi xin Đức Bà Maria trọn đời đồng trinh, các Thiên thần, các Thánh và anh chị em, khẩn cầu cho tôi trước tòa Thiên Chúa, Chúa chúng ta. Amen.',
'[{"lines":["Tôi thú nhận cùng Thiên Chúa toàn năng,","và cùng anh chị em: tôi đã phạm tội nhiều","trong tư tưởng, lời nói, việc làm,","và những điều thiếu sót:"]},{"lines":["lỗi tại tôi, lỗi tại tôi,","lỗi tại tôi mọi đàng."]},{"lines":["Vì vậy tôi xin Đức Bà Maria trọn đời đồng trinh,","các Thiên thần, các Thánh và anh chị em,","khẩn cầu cho tôi trước tòa Thiên Chúa,","Chúa chúng ta. Amen."]}]'::jsonb,
true),

('Kinh Ăn Năn Tội',
'Lạy Chúa con, Chúa là Đấng trọn tốt trọn lành vô cùng, Chúa đã dựng nên con, và cho Con Chúa ra đời chịu nạn chịu chết vì con, mà con đã cả lòng phản nghịch lỗi nghĩa cùng Chúa, thì con lo buồn đau đớn cùng chê ghét mọi tội con trên hết mọi sự; con dốc lòng chừa cải, và nhờ ơn Chúa thì con sẽ lánh xa dịp tội, cùng làm việc đền tội cho xứng. Amen.',
'[{"lines":["Lạy Chúa con, Chúa là Đấng","trọn tốt trọn lành vô cùng,","Chúa đã dựng nên con, và cho Con Chúa","ra đời chịu nạn chịu chết vì con,"]},{"lines":["mà con đã cả lòng phản nghịch","lỗi nghĩa cùng Chúa, thì con lo buồn đau đớn","cùng chê ghét mọi tội con trên hết mọi sự;"]},{"lines":["con dốc lòng chừa cải, và nhờ ơn Chúa","thì con sẽ lánh xa dịp tội,","cùng làm việc đền tội cho xứng. Amen."]}]'::jsonb,
true),

('Kinh Lạy Nữ Vương',
'Lạy Nữ Vương, Mẹ nhân lành, làm cho chúng con được sống, được vui, được cậy. Thân lạy Mẹ, chúng con con cháu Evà ở chốn khách đày kêu đến cùng Bà, chúng con ở nơi khóc lóc than thở kêu khấn Bà thương.
Hỡi ôi! Bà là Chúa bầu chúng con, xin ghé mặt thương xem chúng con. Đến sau khỏi đày, xin cho chúng con được thấy Đức Chúa Giêsu con lòng Bà gồm phúc lạ. Ôi khoan thay! Nhân thay! Dịu thay! Thánh Maria trọn đời đồng trinh. Amen.',
'[{"lines":["Lạy Nữ Vương, Mẹ nhân lành,","làm cho chúng con được sống,","được vui, được cậy."]},{"lines":["Thân lạy Mẹ, chúng con con cháu Evà","ở chốn khách đày kêu đến cùng Bà,","chúng con ở nơi khóc lóc","than thở kêu khấn Bà thương."]},{"lines":["Hỡi ôi! Bà là Chúa bầu chúng con,","xin ghé mặt thương xem chúng con.","Đến sau khỏi đày, xin cho chúng con được thấy","Đức Chúa Giêsu con lòng Bà gồm phúc lạ."]},{"lines":["Ôi khoan thay! Nhân thay! Dịu thay!","Thánh Maria trọn đời đồng trinh. Amen."]}]'::jsonb,
true);
