;(function(){
  const lists = ["clients","spaces","reservations","guests","transactions","maintenance","cleaning","laundry","inventory","utilities","employees"];

  function asList(data, key){
    return Array.isArray(data?.[key]) ? data[key] : [];
  }

  function validateReferentialIntegrity(data){
    const clientIds = new Set(asList(data,"clients").map(x => x.id).filter(Boolean));
    const spaceIds = new Set(asList(data,"spaces").map(x => x.id).filter(Boolean));
    const reservationIds = new Set(asList(data,"reservations").map(x => x.id).filter(Boolean));

    for(const list of lists){
      if(data?.[list] !== undefined && !Array.isArray(data[list])) return `${list} deve ser uma lista.`;
      const ids = new Set();
      for(const item of asList(data,list)){
        if(!item.id) return `${list} possui registro sem identificador.`;
        if(ids.has(item.id)) return `${list} possui identificador duplicado: ${item.id}.`;
        ids.add(item.id);
      }
    }

    for(const r of asList(data,"reservations")){
      if(!r.clientId || !r.spaceId) return "Reserva sem cliente ou espaço.";
      if(!clientIds.has(r.clientId)) return "Reserva referencia cliente inexistente.";
      if(!spaceIds.has(r.spaceId)) return "Reserva referencia espaço inexistente.";
      if(r.start && r.end && r.end < r.start) return "Reserva com período invertido.";
    }

    for(const g of asList(data,"guests")){
      if(g.reservationId && !reservationIds.has(g.reservationId)) return "Hóspede referencia reserva inexistente.";
      if(g.clientId && !clientIds.has(g.clientId)) return "Hóspede referencia cliente inexistente.";
      if(g.stayStart && g.stayEnd && g.stayEnd < g.stayStart) return "Hóspede com período invertido.";
    }

    for(const t of asList(data,"transactions")){
      if(t.clientId && !clientIds.has(t.clientId)) return "Lançamento financeiro referencia cliente inexistente.";
      if(t.reservationId && !reservationIds.has(t.reservationId)) return "Lançamento financeiro referencia reserva inexistente.";
      if(t.amount !== undefined && Number(t.amount) < 0) return "Lançamento financeiro com valor negativo.";
    }

    return "";
  }

  window.EstanciaStateValidation = { lists, validateReferentialIntegrity };
})();
