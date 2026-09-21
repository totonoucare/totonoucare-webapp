export function experienceSignal(feature,detail={}){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('mibyo-experience',{detail:{feature,...detail}}));
}
