$(document).ready(function() {
  const onSuccessfulGameCreation = (data, status) => {
    console.log(data, status);
  };
  const onErrorGameCreation = (response, status, error) => {
    console.error(response, status, error);
  };

  $("#createGameButton").click(function(evt) {
    evt.preventDefault();

    const playerName = $("#createName").val();

    if (playerName.length > 0) {
      $.ajax({
        type: "POST",
        url: "http://localhost:8000/createGame",
        data: { name: playerName },
        success: onSuccessfulGameCreation,
        error: onErrorGameCreation
      });
    }
  });

  console.log("index.js loaded");
});
