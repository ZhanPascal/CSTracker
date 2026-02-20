import { useState } from 'react';
import './ProfileSection.css';

const ProfileSection = () => {
  const [pseudo, setPseudo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Pseudo saisi :', pseudo);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>Mon profil</h1>
        <form className="profile-input-group" onSubmit={handleSubmit}>
          <label htmlFor="pseudo">Pseudo</label>
          <input
            id="pseudo"
            type="text"
            className="profile-input"
            placeholder="Entrez votre pseudo..."
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="profile-submit">
            Valider
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSection;
