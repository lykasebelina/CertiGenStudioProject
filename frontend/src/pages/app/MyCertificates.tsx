import { Heart } from 'lucide-react';

function MyCertificates() {
  return (
    <div className="h-full bg-slate-600 flex items-center justify-center">
      <div className="text-center">
        <Heart className="w-24 h-24 text-slate-400 mx-auto mb-4" />
        <h2 className="text-2xl text-white mb-2">Favorites</h2>
        <p className="text-slate-400">Your saved favorite certificates</p>
      </div>
    </div>
  );
}

export default MyCertificates;
