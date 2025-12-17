// Chess piece data
const pieces = {
    white: ['♔', '♕', '♖', '♗', '♘', '♙'],
    black: ['♚', '♛', '♜', '♝', '♞', '♟']
};

// Mapping from Unicode pieces to FEN characters
const pieceToFEN = {
    '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N', '♙': 'P',
    '♚': 'k', '♛': 'q', '♜': 'r', '♝': 'b', '♞': 'n', '♟': 'p'
};

// Mapping from FEN characters to Unicode pieces
const FENtoPiece = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Board state
let boardState = Array(8).fill(null).map(() => Array(8).fill(null));

// Starting position in FEN notation
const startingFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

// WebSocket connection
let ws = null;


// Create chessboard with algebraic notation
function createChessboard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';
    
    // Remove wrapper modifications if they exist
    let wrapper = board.parentElement;
    if (wrapper.classList.contains('board-wrapper')) {
        // Remove old labels
        const rankLabels = wrapper.querySelector('.rank-labels');
        const fileLabels = wrapper.querySelector('.file-labels');
        if (rankLabels) rankLabels.remove();
        if (fileLabels) fileLabels.remove();
    } else {
        wrapper = document.createElement('div');
        wrapper.className = 'board-wrapper';
        board.parentNode.insertBefore(wrapper, board);
        wrapper.appendChild(board);
    }
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            // Add file letter for bottom row
            square.dataset.file = files[col];
            
            // Add rank number for leftmost column (8 to 1)
            square.dataset.rank = 8 - row;
            
            board.appendChild(square);
        }
    }
}

// Create piece palette
function createPiecePalette() {
    const whitePieces = document.getElementById('white-pieces');
    const blackPieces = document.getElementById('black-pieces');
    
    pieces.white.forEach(piece => {
        const pieceEl = createPieceElement(piece);
        whitePieces.appendChild(pieceEl);
    });
    
    pieces.black.forEach(piece => {
        const pieceEl = createPieceElement(piece);
        blackPieces.appendChild(pieceEl);
    });
}

// Create a draggable piece element
function createPieceElement(piece) {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'chess-piece';
    pieceEl.textContent = piece;
    pieceEl.draggable = true;
    
    pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', piece);
        e.dataTransfer.effectAllowed = 'copy';
    });
    
    return pieceEl;
}

// Make board squares droppable
function makeSquaresDroppable() {
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(square => {
        square.addEventListener('dragover', (e) => {
            e.preventDefault();
            square.classList.add('drag-over');
        });
        
        square.addEventListener('dragleave', () => {
            square.classList.remove('drag-over');
        });
        
        square.addEventListener('drop', (e) => {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            square.textContent = piece;
            boardState[row][col] = piece;
            square.classList.remove('drag-over');
        });
        
        // Right-click to remove piece
        square.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            square.textContent = '';
            boardState[row][col] = null;
        });
    });
}

// Convert board state to FEN notation
function generateFEN() {
    const turn = document.getElementById('turn-select').value;
    let fen = '';
    
    // Generate piece placement (first part of FEN)
    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            
            if (piece === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                fen += pieceToFEN[piece];
            }
        }
        
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        
        if (row < 7) {
            fen += '/';
        }
    }
    
    // Add active color
    fen += ' ' + (turn === 'white' ? 'w' : 'b');
    
    // Add castling availability (simplified - would need to track if pieces moved)
    fen += ' KQkq';
    
    // Add en passant target square (none for now)
    fen += ' -';
    
    // Add halfmove clock and fullmove number
    fen += ' 0 1';
    
    return fen;
}

// Load position from FEN notation
function loadFEN(fen) {
    // Clear current board
    boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Parse only the piece placement part (before first space)
    const fenParts = fen.split(' ');
    const piecePlacement = fenParts[0];
    const ranks = piecePlacement.split('/');
    
    for (let row = 0; row < 8; row++) {
        let col = 0;
        const rank = ranks[row];
        
        for (let i = 0; i < rank.length; i++) {
            const char = rank[i];
            
            if (char >= '1' && char <= '8') {
                // Empty squares
                col += parseInt(char);
            } else {
                // Piece
                boardState[row][col] = FENtoPiece[char];
                col++;
            }
        }
    }
    
    // Update the visual board
    updateBoardDisplay();
}

// Update the visual board from boardState
function updateBoardDisplay() {
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = boardState[row][col];
        
        square.textContent = piece || '';
    });
}

// Reset board to starting position
function resetBoard() {
    loadFEN(startingFEN);
    document.getElementById('turn-select').value = 'white';
    analyzePosition();
}

// Initialize WebSocket connection
function initializeWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        ws = new WebSocket('wss://chess-api.com/v1');
        
        ws.onopen = () => {
            console.log('WebSocket connection established');
            resolve();
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    });
}

// Get best move using Chess API via POST
async function getBestMovePost(fen) {
    try {
        const response = await fetch("https://chess-api.com/v1", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                fen: fen,
                depth: 12,
                variants: 3
            }),
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching best move:', error);
        throw error;
    }
}

// Display engine analysis
function displayEngineAnalysis(analysisData) {
    const analysisResult = document.getElementById('analysis-result');
    
    if (!analysisData || analysisData.length === 0) {
        analysisResult.innerHTML += '<p><strong>Engine Analysis:</strong> No analysis available.</p>';
        return;
    }
    
    // Find the bestmove
    const bestMove = analysisData.find(move => move.type === 'bestmove') || analysisData[analysisData.length - 1];
    
    let engineAnalysis = '<div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">';
    engineAnalysis += '<h3>Stockfish 17 Analysis:</h3>';
    
    if (bestMove) {
        engineAnalysis += `<p><strong>Best Move:</strong> ${bestMove.san || bestMove.lan}</p>`;
        engineAnalysis += `<p><strong>Evaluation:</strong> ${bestMove.eval !== undefined ? bestMove.eval.toFixed(2) : 'N/A'}</p>`;
        engineAnalysis += `<p><strong>Depth:</strong> ${bestMove.depth}</p>`;
        
        if (bestMove.winChance !== undefined) {
            engineAnalysis += `<p><strong>Win Chance:</strong> ${bestMove.winChance.toFixed(1)}%</p>`;
        }
        
        if (bestMove.mate !== null && bestMove.mate !== undefined) {
            engineAnalysis += `<p><strong>Mate in:</strong> ${Math.abs(bestMove.mate)} moves</p>`;
        }
        
        engineAnalysis += `<p><strong>Position:</strong> ${bestMove.text || 'Analysis complete'}</p>`;
        
        // Show continuation if available
        if (bestMove.continuationArr && bestMove.continuationArr.length > 0) {
            engineAnalysis += '<p><strong>Best line:</strong></p>';
            engineAnalysis += '<div class="move-list">';
            bestMove.continuationArr.forEach((move, index) => {
                if (index % 2 === 0) {
                    engineAnalysis += `<p>${Math.floor(index / 2) + 1}. ${move} `;
                } else {
                    engineAnalysis += `${move}</p>`;
                }
            });
            engineAnalysis += '</div>';
        }
    }
    
    // Show top 3 moves if available
    const topMoves = analysisData.filter(move => move.type === 'move' || move.type === 'bestmove').slice(0, 3);
    if (topMoves.length > 1) {
        engineAnalysis += '<p style="margin-top: 15px;"><strong>Top Moves:</strong></p>';
        engineAnalysis += '<div class="move-list">';
        topMoves.forEach((move, index) => {
            engineAnalysis += `<p>${index + 1}. ${move.san || move.lan} (${move.eval !== undefined ? move.eval.toFixed(2) : 'N/A'})</p>`;
        });
        engineAnalysis += '</div>';
    }
    
    engineAnalysis += '</div>';
    
    const currentContent = analysisResult.innerHTML;
    analysisResult.innerHTML = currentContent + engineAnalysis;
}

// Analyze position
async function analyzePosition() {
    const turn = document.getElementById('turn-select').value;
    const analysisResult = document.getElementById('analysis-result');
    const fenOutput = document.getElementById('fen-output');
    
    // Count pieces
    let whitePieces = 0;
    let blackPieces = 0;
    let pieceCount = {
        white: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 },
        black: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 }
    };
    
    boardState.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                if (pieces.white.includes(piece)) {
                    whitePieces++;
                    if (piece === '♔') pieceCount.white.king++;
                    else if (piece === '♕') pieceCount.white.queen++;
                    else if (piece === '♖') pieceCount.white.rook++;
                    else if (piece === '♗') pieceCount.white.bishop++;
                    else if (piece === '♘') pieceCount.white.knight++;
                    else if (piece === '♙') pieceCount.white.pawn++;
                }
                if (pieces.black.includes(piece)) {
                    blackPieces++;
                    if (piece === '♚') pieceCount.black.king++;
                    else if (piece === '♛') pieceCount.black.queen++;
                    else if (piece === '♜') pieceCount.black.rook++;
                    else if (piece === '♝') pieceCount.black.bishop++;
                    else if (piece === '♞') pieceCount.black.knight++;
                    else if (piece === '♟') pieceCount.black.pawn++;
                }
            }
        });
    });
    
    // Generate FEN
    const fen = generateFEN();
    fenOutput.textContent = fen;
    
    if (whitePieces === 0 && blackPieces === 0) {
        analysisResult.innerHTML = '<p>The board is empty. Please place some pieces or click "Reset to Start".</p>';
        return;
    }
    
    // Basic analysis
    let analysis = `<h3>Current Position:</h3>`;
    analysis += `<p><strong>Turn:</strong> ${turn.charAt(0).toUpperCase() + turn.slice(1)}</p>`;
    analysis += `<p><strong>White pieces:</strong> ${whitePieces}</p>`;
    analysis += `<p><strong>Black pieces:</strong> ${blackPieces}</p>`;
    
    // Material count
    analysis += `<p><strong>White:</strong> K:${pieceCount.white.king} Q:${pieceCount.white.queen} R:${pieceCount.white.rook} B:${pieceCount.white.bishop} N:${pieceCount.white.knight} P:${pieceCount.white.pawn}</p>`;
    analysis += `<p><strong>Black:</strong> K:${pieceCount.black.king} Q:${pieceCount.black.queen} R:${pieceCount.black.rook} B:${pieceCount.black.bishop} N:${pieceCount.black.knight} P:${pieceCount.black.pawn}</p>`;
    
    // Material advantage calculation
    const materialValue = {
        queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1
    };
    
    let whiteValue = pieceCount.white.queen * materialValue.queen +
                     pieceCount.white.rook * materialValue.rook +
                     pieceCount.white.bishop * materialValue.bishop +
                     pieceCount.white.knight * materialValue.knight +
                     pieceCount.white.pawn * materialValue.pawn;
    
    let blackValue = pieceCount.black.queen * materialValue.queen +
                     pieceCount.black.rook * materialValue.rook +
                     pieceCount.black.bishop * materialValue.bishop +
                     pieceCount.black.knight * materialValue.knight +
                     pieceCount.black.pawn * materialValue.pawn;
    
    let diff = whiteValue - blackValue;
    
    if (diff > 0) {
        analysis += `<p><strong>Material advantage:</strong> White +${diff}</p>`;
    } else if (diff < 0) {
        analysis += `<p><strong>Material advantage:</strong> Black +${Math.abs(diff)}</p>`;
    } else {
        analysis += `<p><strong>Material:</strong> Equal</p>`;
    }
    
    analysisResult.innerHTML = analysis;
    
    // Get engine analysis
    try {
        analysisResult.innerHTML += '<p style="margin-top: 15px;"><em>Analyzing position with Stockfish...</em></p>';
        
        const engineData = await getBestMovePost(fen);
        
        // Handle both array and single object responses
        const analysisArray = Array.isArray(engineData) ? engineData : [engineData];
        displayEngineAnalysis(analysisArray);
    } catch (error) {
        console.error('Error getting engine analysis:', error);
        analysisResult.innerHTML += '<p style="color: red;"><strong>Engine Analysis:</strong> Unable to connect to Chess API. Please try again.</p>';
    }
}

// Clear board
function clearBoard() {
    boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.textContent = '');
    document.getElementById('analysis-result').innerHTML = '<p>Place pieces on the board and click "Analyze Position" to see the FEN notation and position details.</p>';
    document.getElementById('fen-output').textContent = '';
}

// Copy FEN to clipboard
function copyFEN() {
    const fenText = document.getElementById('fen-output').textContent;
    
    if (!fenText) {
        alert('No FEN to copy. Please analyze the position first.');
        return;
    }
    
    navigator.clipboard.writeText(fenText).then(() => {
        const btn = document.getElementById('copy-fen-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy FEN: ' + err);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createChessboard();
    createPiecePalette();
    makeSquaresDroppable();
    
    // Load starting position
    resetBoard();
    
    document.getElementById('analyze-btn').addEventListener('click', analyzePosition);
    document.getElementById('clear-btn').addEventListener('click', clearBoard);
    document.getElementById('reset-btn').addEventListener('click', resetBoard);
    document.getElementById('copy-fen-btn').addEventListener('click', copyFEN);
});