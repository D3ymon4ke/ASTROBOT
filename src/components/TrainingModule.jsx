import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Play, CheckCircle, Award, Plus, Trash2, Edit3, 
  HelpCircle, BookOpen, Star, Sparkles, Video, FileText, Check, X, Flame, Lock,
  Search, Filter, RefreshCw, AlertCircle, ArrowRight
} from 'lucide-react';

export const DEFAULT_LESSONS = [
  {
    id: 'lesson_1',
    title: '🚀 Introdução ao ASTROBOT & Piloto Automático',
    category: 'Iniciante',
    duration: '12 min',
    thumbnail: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Aprenda os primeiros passos para configurar sua banca, selecionar ativos recomendados e ativar a inteligência artificial com total segurança.',
    xpReward: 150,
    quiz: [
      {
        question: 'Qual é o primeiro passo recomendado antes de iniciar as operações automáticas?',
        options: [
          'Configurar o Stop Loss e a Meta Diária no Gerenciamento',
          'Operar sem limite de perda',
          'Desativar a verificação de segurança da API',
          'Usar o maior valor de entrada possível'
        ],
        correctIndex: 0
      },
      {
        question: 'O que o recurso de Piloto Automático realiza?',
        options: [
          'Seleciona a melhor estratégia com base na análise de tendência atual',
          'Garante 100% de vitórias sem qualquer risco',
          'Executa ordens na bolsa de valores tradicional',
          'Apenas envia mensagens pelo WhatsApp'
        ],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'lesson_2',
    title: '⚡ Domine o Martingale & Gestão Avançada de Risco',
    category: 'Intermediário',
    duration: '18 min',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Entenda a matemática por trás da Matriz de Martingale, fator de sobrevivência da banca e cálculo de recuperação sem comprometer o capital.',
    xpReward: 200,
    quiz: [
      {
        question: 'Como a calculadora de Martingale auxilia na preservação de banca?',
        options: [
          'Calculando a margem máxima de Hits em sequência suportados',
          'Aumentando a aposta aleatoriamente',
          'Ocultando o saldo da conta de negociação',
          'Removendo a taxa da corretora'
        ],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'lesson_3',
    title: '📈 Alavancagem Responsável com Simulador SorosGale',
    category: 'Avançado',
    duration: '15 min',
    thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Descubra como combinar entradas compostas (Soros) com cobertura de segurança (Gale) para multiplicar lucros mantendo o risco inicial travado.',
    xpReward: 250,
    quiz: [
      {
        question: 'Qual é a principal vantagem do gerenciamento SorosGale?',
        options: [
          'Reinvestir parte dos lucros em mãos compostas arriscando apenas o capital inicial da 1ª entrada',
          'Duplicar a banca em todas as operações sem ordens de perda',
          'Ignorar as análises de mercado da IA',
          'Operar 24 horas sem pausar'
        ],
        correctIndex: 0
      }
    ]
  },
  {
    id: 'lesson_4',
    title: '📡 Leitura de Sinais & Scanner IA em Tempo Real',
    category: 'Robôs & IA',
    duration: '14 min',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Aprenda a interpretar o radar do Scanner IA, níveis de assertividade histórica e confluência de indicadores técnicos.',
    xpReward: 180,
    quiz: [
      {
        question: 'Qual porcentagem de assertividade histórica é considerada ideal para validar um sinal do Scanner?',
        options: [
          'Assertividade superior a 75% com confluência de tendência',
          'Qualquer valor abaixo de 40%',
          'Apenas sinais com 100% de vitórias absolutas',
          'O scanner não necessita de validação'
        ],
        correctIndex: 0
      }
    ]
  }
];

export default function TrainingModule({
  isAdmin = false,
  currentUserEmail = 'demo@astrobot.com',
  profileData = {},
  onAddXp = () => {}
}) {
  const [lessons, setLessons] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_training_lessons');
      return saved ? JSON.parse(saved) : DEFAULT_LESSONS;
    } catch {
      return DEFAULT_LESSONS;
    }
  });

  const [completedLessonIds, setCompletedLessonIds] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_completed_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLesson, setActiveLesson] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Admin Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Iniciante');
  const [newDuration, setNewDuration] = useState('15 min');
  const [newThumbnail, setNewThumbnail] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newXpReward, setNewXpReward] = useState(150);
  const [newQuizQuestions, setNewQuizQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctIndex: 0 }
  ]);

  // Sync lessons from localStorage if changed elsewhere
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('astrobot_training_lessons');
        if (saved) setLessons(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveLessonsToStorage = (updated) => {
    setLessons(updated);
    localStorage.setItem('astrobot_training_lessons', JSON.stringify(updated));
  };

  const handleStartLesson = (lesson) => {
    setActiveLesson(lesson);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  const handleSelectOption = (qIdx, oIdx) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmitQuiz = () => {
    if (!activeLesson || !activeLesson.quiz) return;
    let correctCount = 0;
    activeLesson.quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const passed = correctCount === activeLesson.quiz.length;
    setQuizScore(correctCount);
    setQuizSubmitted(true);

    if (passed && !completedLessonIds.includes(activeLesson.id)) {
      const newCompleted = [...completedLessonIds, activeLesson.id];
      setCompletedLessonIds(newCompleted);
      localStorage.setItem('astrobot_completed_lessons', JSON.stringify(newCompleted));
      onAddXp(activeLesson.xpReward);
    }
  };

  // Helper for embed URLs
  const formatVideoUrl = (url) => {
    if (!url) return 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return url;
  };

  const handleOpenAdminModal = (lesson = null) => {
    if (lesson) {
      setEditingLessonId(lesson.id);
      setNewTitle(lesson.title || '');
      setNewCategory(lesson.category || 'Iniciante');
      setNewDuration(lesson.duration || '15 min');
      setNewThumbnail(lesson.thumbnail || '');
      setNewVideoUrl(lesson.videoUrl || '');
      setNewDescription(lesson.description || '');
      setNewXpReward(lesson.xpReward || 150);
      setNewQuizQuestions(lesson.quiz && lesson.quiz.length > 0 ? lesson.quiz : [{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
    } else {
      setEditingLessonId(null);
      setNewTitle('');
      setNewCategory('Iniciante');
      setNewDuration('15 min');
      setNewThumbnail('');
      setNewVideoUrl('');
      setNewDescription('');
      setNewXpReward(150);
      setNewQuizQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
    }
    setShowAdminModal(true);
  };

  const handleSaveLessonAdmin = (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) {
      alert('Por favor, informe o título da aula.');
      return;
    }

    const formattedEmbed = formatVideoUrl(newVideoUrl);

    const lessonObj = {
      id: editingLessonId || `lesson_${Date.now()}`,
      title: newTitle,
      category: newCategory,
      duration: newDuration,
      thumbnail: newThumbnail.trim() || 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
      videoUrl: formattedEmbed,
      description: newDescription,
      xpReward: Number(newXpReward) || 150,
      quiz: newQuizQuestions.filter(q => q.question.trim().length > 0)
    };

    let updated = [];
    if (editingLessonId) {
      updated = lessons.map(l => l.id === editingLessonId ? lessonObj : l);
    } else {
      updated = [...lessons, lessonObj];
    }

    saveLessonsToStorage(updated);
    setShowAdminModal(false);
    alert(editingLessonId ? 'Aula atualizada com sucesso!' : 'Nova aula de treinamento publicada com sucesso!');
  };

  const handleDeleteLesson = (id) => {
    if (window.confirm('Deseja realmente excluir esta aula de treinamento?')) {
      const updated = lessons.filter(l => l.id !== id);
      saveLessonsToStorage(updated);
    }
  };

  // Filter lessons
  const categories = ['Todas', 'Iniciante', 'Intermediário', 'Avançado', 'Robôs & IA', 'Gerenciamento'];
  const filteredLessons = lessons.filter(l => {
    const matchesCat = activeCategory === 'Todas' || l.category === activeCategory;
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalXpPossible = lessons.reduce((sum, l) => sum + (l.xpReward || 0), 0);
  const earnedXp = lessons.filter(l => completedLessonIds.includes(l.id)).reduce((sum, l) => sum + (l.xpReward || 0), 0);
  const progressPercent = lessons.length > 0 ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem', color: 'white' }}>
      
      {/* HEADER HERO */}
      <div className="glass-panel" style={{
        padding: '1.75rem 2rem',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 11, 28, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <GraduationCap size={28} style={{ color: 'var(--primary-light)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>
              Academia ASTROBOT de Treinamento
            </h2>
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.62rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              Ganhe +{totalXpPossible} XP
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            Aprenda a operar com inteligência artificial, dominar os gerenciamentos avançados e realizar provas interativas para turbinar o nível do seu perfil VIP!
          </p>
        </div>

        {/* User Progress Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '0.65rem 1.1rem',
            borderRadius: '14px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Conclusão</span>
            <strong style={{ fontSize: '1.3rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              {progressPercent}%
            </strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              {completedLessonIds.length} de {lessons.length} aulas
            </span>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '0.65rem 1.1rem',
            borderRadius: '14px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>XP de Treino</span>
            <strong style={{ fontSize: '1.3rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              +{earnedXp} XP
            </strong>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              Conquistados
            </span>
          </div>

          {isAdmin && (
            <button
              onClick={() => handleOpenAdminModal()}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} /> Publicar Aula (Admin)
            </button>
          )}
        </div>
      </div>

      {/* FILTER CHIPS & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                border: '1px solid ' + (activeCategory === cat ? 'transparent' : 'rgba(255,255,255,0.06)'),
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar aula ou tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 34px',
              background: 'rgba(9, 9, 15, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              color: 'white',
              fontSize: '0.78rem'
            }}
          />
        </div>
      </div>

      {/* ACTIVE LESSON VIEWPORT MODAL */}
      {activeLesson && (
        <div className="glass-panel" style={{
          padding: '1.75rem',
          borderRadius: '20px',
          background: 'rgba(15, 11, 28, 0.95)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {activeLesson.category} • {activeLesson.duration}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={20} style={{ color: 'var(--primary-light)' }} /> {activeLesson.title}
              </h3>
            </div>
            <button
              onClick={() => setActiveLesson(null)}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Embedded Video (Standard 16:9 Aspect Ratio Container) */}
          <div style={{
            width: '100%',
            maxWidth: '900px',
            aspectRatio: '16 / 9',
            margin: '0 auto 1.5rem auto',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#000',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <iframe
              src={activeLesson.videoUrl}
              title={activeLesson.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
            {activeLesson.description}
          </p>

          {/* QUIZ SECTION */}
          {activeLesson.quiz && activeLesson.quiz.length > 0 && (
            <div style={{ background: 'rgba(9, 6, 18, 0.7)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={18} style={{ color: '#f59e0b' }} /> Prova de Fixação (+{activeLesson.xpReward} XP)
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Responda todas com 100% de acerto para resgatar o XP
                </span>
              </div>

              {activeLesson.quiz.map((q, qIdx) => (
                <div key={qIdx} style={{ marginBottom: '1.5rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'white', display: 'block', marginBottom: '0.65rem' }}>
                    {qIdx + 1}. {q.question}
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[qIdx] === oIdx;
                      const isCorrect = q.correctIndex === oIdx;
                      let bg = 'rgba(255,255,255,0.02)';
                      let border = 'rgba(255,255,255,0.06)';

                      if (quizSubmitted) {
                        if (isCorrect) {
                          bg = 'rgba(16, 185, 129, 0.15)';
                          border = '#10b981';
                        } else if (isSelected && !isCorrect) {
                          bg = 'rgba(239, 68, 68, 0.15)';
                          border = '#ef4444';
                        }
                      } else if (isSelected) {
                        bg = 'rgba(139, 92, 246, 0.2)';
                        border = 'var(--primary-light)';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(qIdx, oIdx)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: bg,
                            border: `1px solid ${border}`,
                            color: 'white',
                            fontSize: '0.82rem',
                            textAlign: 'left',
                            cursor: quizSubmitted ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!quizSubmitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Enviar Respostas e Resgatar XP
                </button>
              ) : (
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: quizScore === activeLesson.quiz.length ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: `1px solid ${quizScore === activeLesson.quiz.length ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', color: quizScore === activeLesson.quiz.length ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {quizScore === activeLesson.quiz.length ? `🎉 Parabéns! Você acertou 100% das questões e ganhou +${activeLesson.xpReward} XP!` : '❌ Você respondeu incorretamente a alguma questão. Revise o vídeo e tente novamente.'}
                  </span>
                  <button
                    onClick={() => { setQuizSubmitted(false); setSelectedAnswers({}); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LESSON CARDS GRID */}
      {filteredLessons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(15, 11, 28, 0.3)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <BookOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>Nenhuma aula encontrada</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tente alterar a categoria ou o termo de busca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.35rem' }}>
          {filteredLessons.map(lesson => {
            const isDone = completedLessonIds.includes(lesson.id);
            return (
              <div
                key={lesson.id}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'rgba(15, 11, 28, 0.45)',
                  border: isDone ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                  position: 'relative'
                }}
              >
                {/* Thumbnail Header */}
                <div style={{ height: '160px', width: '100%', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => handleStartLesson(lesson)}>
                  <img
                    src={lesson.thumbnail}
                    alt={lesson.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 11, 28, 0.95) 0%, transparent 60%)'
                  }} />

                  {/* Play Overlay Icon */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)'
                  }}>
                    <Play size={20} fill="white" style={{ marginLeft: '2px', color: 'white' }} />
                  </div>

                  {/* Badge Category */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(9, 6, 18, 0.85)',
                    color: 'var(--primary-light)',
                    fontSize: '0.62rem',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}>
                    {lesson.category} • {lesson.duration}
                  </span>

                  {isDone && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#10b981',
                      color: 'white',
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle size={12} /> Concluída
                    </span>
                  )}
                </div>

                {/* Details Body */}
                <div style={{ padding: '1.1rem 1.25rem 1.25rem 1.25rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'white', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                    {lesson.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.45' }}>
                    {lesson.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={13} /> +{lesson.xpReward} XP
                    </span>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAdminModal(lesson); }}
                            style={{ padding: '6px 8px', background: 'rgba(139,92,246,0.15)', color: 'var(--primary-light)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Editar Aula"
                          >
                            <Edit3 size={12} /> Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                            style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                            title="Excluir Aula"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleStartLesson(lesson)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                          color: 'white',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Play size={12} /> Assistir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIN ADD/EDIT LESSON MODAL */}
      {showAdminModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '20px', background: '#0e0b18', border: '1px solid var(--primary)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '800' }}>
                {editingLessonId ? '✏️ Editar Aula de Treinamento' : '🎓 Publicar Nova Aula de Treinamento'}
              </h3>
              <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveLessonAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Título da Aula</label>
                <input type="text" placeholder="Ex: 🚀 Estratégias de Alavancagem Responsável" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Categoria</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }}>
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Robôs & IA">Robôs & IA</option>
                    <option value="Gerenciamento">Gerenciamento</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Duração</label>
                  <input type="text" placeholder="15 min" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recompensa (XP)</label>
                  <input type="number" placeholder="150" value={newXpReward} onChange={(e) => setNewXpReward(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Link Embed do Vídeo (YouTube/Vimeo)</label>
                <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>URL da Imagem da Capa (Thumbnail)</label>
                <input type="text" placeholder="https://..." value={newThumbnail} onChange={(e) => setNewThumbnail(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Descrição Explicativa da Aula</label>
                <textarea placeholder="Resumo do conteúdo ensinado na aula..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '0.65rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.82rem' }} />
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: 'white' }}>Perguntas da Prova (Quiz)</h4>
                  <button
                    type="button"
                    onClick={() => setNewQuizQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctIndex: 0 }])}
                    style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    + Adicionar Pergunta
                  </button>
                </div>

                {newQuizQuestions.map((q, qIdx) => (
                  <div key={qIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '10px', marginBottom: '0.85rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <input
                      type="text"
                      placeholder={`Pergunta #${qIdx + 1}`}
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewQuizQuestions(prev => prev.map((item, idx) => idx === qIdx ? { ...item, question: val } : item));
                      }}
                      style={{ width: '100%', padding: '0.5rem', background: '#090612', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {q.options.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Opção ${String.fromCharCode(65 + oIdx)}`}
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewQuizQuestions(prev => prev.map((item, idx) => {
                              if (idx === qIdx) {
                                const newOpts = [...item.options];
                                newOpts[oIdx] = val;
                                return { ...item, options: newOpts };
                              }
                              return item;
                            }));
                          }}
                          style={{ padding: '0.45rem', background: '#090612', border: q.correctIndex === oIdx ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                        />
                      ))}
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span>Opção Correta:</span>
                      <select
                        value={q.correctIndex}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewQuizQuestions(prev => prev.map((item, idx) => idx === qIdx ? { ...item, correctIndex: val } : item));
                        }}
                        style={{ padding: '2px 8px', background: '#090612', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
                      >
                        <option value={0}>Opção A</option>
                        <option value={1}>Opção B</option>
                        <option value={2}>Opção C</option>
                        <option value={3}>Opção D</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button type="submit" style={{ padding: '0.85rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                {editingLessonId ? 'Salvar Alterações da Aula' : 'Salvar & Publicar Aula'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
