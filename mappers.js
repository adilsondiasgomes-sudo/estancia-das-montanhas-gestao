;(function(){
  const maps = {
    client: {
      id:"id", name:"name", phone:"phone", document:"document", email:"email",
      birthDate:"birth_date", preferredContact:"preferred_contact",
      address:"address", city:"city", state:"state", origin:"origin", notes:"notes"
    },
    space: {
      id:"id", name:"name", type:"type", capacity:"capacity",
      baseRate:"base_rate", status:"status"
    },
    reservation: {
      id:"id", clientId:"client_id", spaceId:"space_id", type:"type",
      packageName:"package_name", start:"start_date", startTime:"start_time",
      end:"end_date", endTime:"end_time", guests:"guests",
      exclusiveUse:"exclusive_use", confirmationDeadline:"confirmation_deadline",
      total:"total", paid:"paid", status:"status", checklist:"checklist",
      checkinAt:"checkin_at", checkoutAt:"checkout_at"
    },
    guest: {
      id:"id", clientId:"client_id", contractorCpf:"contractor_cpf",
      reservationId:"reservation_id", fullName:"full_name", cpf:"cpf",
      address:"address", stayStart:"stay_start", stayEnd:"stay_end", notes:"notes"
    },
    transaction: {
      id:"id", date:"date", type:"type", clientId:"client_id",
      reservationId:"reservation_id", category:"category", description:"description",
      amount:"amount", status:"status"
    },
    maintenance: {
      id:"id", due:"due", area:"area", system:"system", priority:"priority",
      responsible:"responsible", status:"status", description:"description"
    },
    cleaning: {
      id:"id", date:"date", area:"area", type:"type",
      responsible:"responsible", status:"status", notes:"notes"
    },
    laundry: {
      id:"id", date:"date", item:"item", qty:"qty",
      status:"status", cost:"cost", notes:"notes"
    },
    inventory: {
      id:"id", item:"item", category:"category", qty:"qty", minimum:"minimum",
      condition:"condition", location:"location", replacementValue:"replacement_value"
    },
    utility: {
      id:"id", month:"month", type:"type", reading:"reading",
      amount:"amount", notes:"notes"
    },
    employee: {
      id:"id", name:"name", role:"role", phone:"phone",
      payType:"pay_type", rate:"rate", status:"status"
    }
  };

  function convert(item, map, reverse){
    return Object.entries(map).reduce((acc,[appKey,dbKey]) => {
      const source = reverse ? dbKey : appKey;
      const target = reverse ? appKey : dbKey;
      if(item && Object.prototype.hasOwnProperty.call(item, source)) acc[target] = item[source];
      return acc;
    }, {});
  }

  function toDatabase(type, item){
    if(!maps[type]) throw new Error(`Mapeamento desconhecido: ${type}`);
    return convert(item, maps[type], false);
  }

  function fromDatabase(type, row){
    if(!maps[type]) throw new Error(`Mapeamento desconhecido: ${type}`);
    return convert(row, maps[type], true);
  }

  window.EstanciaMappers = { maps, toDatabase, fromDatabase };
})();
