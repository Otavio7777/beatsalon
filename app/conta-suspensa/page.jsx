export default function ContaSuspensa() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F8FAFC', fontFamily:"'Inter',sans-serif", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontFamily:'Dancing Script,cursive', fontSize:28, fontWeight:700, color:'#0B1E3D', marginBottom:20 }}>Meu Salão</div>
        <div style={{ width:64, height:64, borderRadius:32, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 20px' }}>⛔</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#991B1B', marginBottom:8 }}>Conta suspensa</div>
        <div style={{ fontSize:14, color:'#64748B', lineHeight:1.7, marginBottom:24 }}>
          O acesso a esta conta foi temporariamente suspenso pelo administrador da plataforma.<br/>
          Entre em contato para mais informações.
        </div>
        <a href="https://wa.me/5531999999999" style={{ display:'inline-block', padding:'12px 24px', background:'#25D366', color:'#fff', borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none', marginBottom:12 }}>
          Falar com suporte
        </a>
        <div style={{ marginTop:12 }}>
          <a href="/login" style={{ fontSize:12, color:'#64748B', textDecoration:'none' }}>← Voltar ao login</a>
        </div>
      </div>
    </div>
  )
}
