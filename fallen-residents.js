import * as T from './vendor/three.module.js?build=ae7840b412f1';
import {CharacterView} from './character-view.js?build=ae7840b412f1';
import {corpseStage,corpseAge} from './death-stages.js?build=ae7840b412f1';
import {groundHeight} from './island-layout.js?build=ae7840b412f1';
export class FallenResidents{
 constructor(scene){this.group=new T.Group();scene.add(this.group);this.models=new Map();}
 update(world,objects,characters){
  const live=new Set();for(const b of world.corpses){if(corpseStage(b)!=='body')continue;live.add(b.id);let root=this.models.get(b.id);
   if(!root){root=objects.get('e'+b.id);if(root){objects.delete('e'+b.id);}else root=new CharacterView(characters[b.country],{...b,adult:b.adult!==false}).root;
    this.group.add(root);this.models.set(b.id,root);root.userData.character.mixer.stopAllAction();
   }
   const age=world.result?Math.max(.55,corpseAge(b)):corpseAge(b),t=Math.min(1,age/.55),f=t*t*(3-2*t);root.rotation.set(0,(b.id%7)*.9,-Math.PI/2*f);root.position.set(b.x,groundHeight(b)+.12*f,b.y);root.scale.setScalar(b.adult===false?.4:.65);
  }
  for(const [id,root] of this.models)if(!live.has(id)){root.userData.character.dispose();this.group.remove(root);this.models.delete(id);}
 }
 clear(){for(const root of this.models.values()){root.userData.character.dispose();this.group.remove(root);}this.models.clear();}
}
