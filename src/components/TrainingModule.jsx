import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Play, CheckCircle, Award, Plus, Trash2, Edit3, 
  HelpCircle, BookOpen, Star, Sparkles, Video, FileText, Check, X, Flame, Lock
} from 'lucide-react';

export default function TrainingModule({
  isAdmin = false,
  currentUserEmail = 'demo@astrobot.com',
  profileData = {},
  onAddXp = () => {}
}) {
  const DEFAULT_LESSONS = [
    {
      id: 'lesson_1',
      title: '🚀 Introdução ao ASTROBOT & Piloto Automático',
      category: 'Iniciante',
      duration: '12 min',
      thumbnail: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: 'Aprenda os primeiros passos para configurar sua banca, selecionar ativos recomendados e ativar a inteligência artificial com segurança.',
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
    }
  ];

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

  const [activeLesson, setActiveLesson] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Admin Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
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
      alert(`🎉 Parabéns! Você concluiu a aula com 100% de aproveitamento e ganhou +${activeLesson.xpReward} XP!`);
    }
  };

  const handleAddLessonAdmin = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newLessonObj = {
      id: `lesson_${Date.now()}`,
      title: newTitle,
      category: newCategory,
      duration: newDuration,
      thumbnail: newThumbnail || 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&auto=format&fit=crop&q=80',
      videoUrl: newVideoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: newDescription,
      xpReward: Number(newXpReward) || 150,
      quiz: newQuizQuestions.filter(q => q.question.trim().length > 0)
    };

    const updated = [...lessons, newLessonObj];
    saveLessonsToStorage(updated);
    setShowAdminModal(false);
    setNewTitle('');
    setNewDescription('');
    alert('Nova aula de treinamento publicada com sucesso!');
  };

  const handleDeleteLesson = (id) => {
    if (window.confirm('Deseja realmente excluir esta aula de treinamento?')) {
      const updated = lessons.filter(l => l.id !== id);
      saveLessonsToStorage(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      {/* HEADER HERO */}
      <div className="glass-panel" style={{
        padding: '1.75rem 2rem',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 11, 28, 0.9) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <GraduationCap size={24} style={{ color: 'var(--primary-light)' }} />
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, color: 'white' }}>
              Academia ASTROBOT de Treinamento
            </h2>
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '10px'
            }}>
              Ganhe XP
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Assista aos tutoriais exclusivos, passe nos testes interativos e suba seu nível de Trader VIP!
          </p>
        </div>

        {/* User Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '0.65rem 1.1rem',
            borderRadius: '14px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Aulas Concluídas</span>
            <strong style={{ fontSize: '1.25rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              {completedLessonIds.length} / {lessons.length}
            </strong>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              style={{
                padding: '0.65rem 1.25rem',
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
              <Plus size={16} /> Publicar Aula
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE LESSON VIEWPORT MODAL */}
      {activeLesson && (
        <div className="glass-panel" style={{
          padding: '1.5rem',
          borderRadius: '20px',
          background: 'rgba(15, 11, 28, 0.95)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} style={{ color: 'var(--primary-light)' }} /> {activeLesson.title}
            </h3>
            <button
              onClick={() => setActiveLesson(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Embedded Video (Standard 16:9 Aspect Ratio Container) */}
          <div style={{
            width: '100%',
            maxWidth: '850px',
            aspectRatio: '16 / 9',
            margin: '0 auto 1.25rem auto',
            borderRadius: '14px',
            overflow: 'hidden',
            background: '#000',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
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

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {activeLesson.description}
          </p>

          {/* QUIZ SECTION */}
          {activeLesson.quiz && activeLesson.quiz.length > 0 && (
            <div style={{ background: 'rgba(9, 6, 18, 0.6)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={16} style={{ color: '#f59e0b' }} /> Prova de Fixação (+{activeLesson.xpReward} XP)
              </h4>

              {activeLesson.quiz.map((q, qIdx) => (
                <div key={qIdx} style={{ marginBottom: '1.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'white', display: 'block', marginBottom: '0.5rem' }}>
                    {qIdx + 1}. {q.question}
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
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
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: bg,
                            border: `1px solid ${border}`,
                            color: 'white',
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            cursor: quizSubmitted ? 'default' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {opt}
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
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.82rem'
                  }}
                >
                  Enviar Respostas e Resgatar XP
                </button>
              ) : (
                <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: quizScore === activeLesson.quiz.length ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {quizScore === activeLesson.quiz.length ? '✅ Aprovado! XP creditado com sucesso.' : '❌ Não foi desta vez. Tente novamente!'}
                  </span>
                  <button
                    onClick={() => { setQuizSubmitted(false); setSelectedAnswers({}); }}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', fontSize: '0.75rem', cursor: 'pointer' }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {lessons.map(lesson => {
          const isDone = completedLessonIds.includes(lesson.id);
          return (
            <div
              key={lesson.id}
              className="glass-panel"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'rgba(15, 11, 28, 0.4)',
                border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.borderColor = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)';
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: '150px', width: '100%', position: 'relative', overflow: 'hidden' }}>
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

                {/* Badge Category */}
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(9, 6, 18, 0.8)',
                  color: 'var(--primary-light)',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  {lesson.category}
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

              {/* Details */}
              <div style={{ padding: '1rem 1.25rem 1.25rem 1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: 'white', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                  {lesson.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {lesson.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Flame size={12} /> +{lesson.xpReward} XP
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                        style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        title="Excluir Aula"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartLesson(lesson)}
                      style={{
                        padding: '6px 12px',
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

      {/* ADMIN ADD LESSON MODAL */}
      {showAdminModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', padding: '1.5rem', borderRadius: '20px', background: '#0e0b18', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>Publicar Nova Aula de Treinamento</h3>
              <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLessonAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input type="text" placeholder="Título da Aula" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required style={{ padding: '0.6rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              <textarea placeholder="Descrição explicativa" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} style={{ padding: '0.6rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              <input type="text" placeholder="Link Embed do Vídeo (YouTube)" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} style={{ padding: '0.6rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              <input type="text" placeholder="URL da Thumbnail Imagem" value={newThumbnail} onChange={(e) => setNewThumbnail(e.target.value)} style={{ padding: '0.6rem', background: '#141022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              <button type="submit" style={{ padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar & Publicar Aula</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
