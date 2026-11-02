package ru.hexlet.booking.presentation

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import kotlinx.serialization.json.Json
import org.koin.core.module.Module
import org.koin.dsl.module
import org.koin.ktor.ext.inject
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger
import ru.hexlet.booking.application.BookingRepository
import ru.hexlet.booking.application.Clock
import ru.hexlet.booking.application.CreateBookingHandler
import ru.hexlet.booking.application.CreateBookingHandlerImpl
import ru.hexlet.booking.application.CreateMeetingTypeHandler
import ru.hexlet.booking.application.CreateMeetingTypeHandlerImpl
import ru.hexlet.booking.application.GetOwnerHandler
import ru.hexlet.booking.application.GetOwnerHandlerImpl
import ru.hexlet.booking.application.ListMeetingTypesHandler
import ru.hexlet.booking.application.ListMeetingTypesHandlerImpl
import ru.hexlet.booking.application.ListSlotsHandler
import ru.hexlet.booking.application.ListSlotsHandlerImpl
import ru.hexlet.booking.application.ListUpcomingBookingsHandler
import ru.hexlet.booking.application.ListUpcomingBookingsHandlerImpl
import ru.hexlet.booking.application.MeetingTypeRepository
import ru.hexlet.booking.application.OwnerProvider
import ru.hexlet.booking.domain.Owner
import ru.hexlet.booking.infrastructure.ConfiguredOwnerProvider
import ru.hexlet.booking.infrastructure.InMemoryBookingRepository
import ru.hexlet.booking.infrastructure.InMemoryMeetingTypeRepository
import ru.hexlet.booking.infrastructure.SystemClock

/** Обработчики команд и запросов. Пока пуст: наполняется по мере появления историй. */
fun applicationModule(): Module =
    module {
        single<GetOwnerHandler> { GetOwnerHandlerImpl(get()) }
        single<ListMeetingTypesHandler> { ListMeetingTypesHandlerImpl(get()) }
        single<CreateMeetingTypeHandler> { CreateMeetingTypeHandlerImpl(get()) }
        single<ListSlotsHandler> { ListSlotsHandlerImpl(get(), get(), get()) }
        single<CreateBookingHandler> { CreateBookingHandlerImpl(get(), get(), get()) }
        single<ListUpcomingBookingsHandler> { ListUpcomingBookingsHandlerImpl(get(), get()) }
    }

/** Реализации портов: часы и хранилища в памяти. Новый вызов даёт свежие хранилища. */
fun infrastructureModule(): Module =
    module {
        single<Clock> { SystemClock() }
        single<MeetingTypeRepository> { InMemoryMeetingTypeRepository() }
        single<BookingRepository> { InMemoryBookingRepository() }
        single<OwnerProvider> { ConfiguredOwnerProvider(get<ApplicationConfig>().owner()) }
    }

private fun ApplicationConfig.owner() =
    Owner(
        name = property("owner.name").getString(),
        title = property("owner.title").getString(),
        avatarUrl = propertyOrNull("owner.avatarUrl")?.getString()?.takeIf { it.isNotBlank() && it != "null" },
    )

/** Конфигурация приложения, читаемая из `application.conf`. */
fun configurationModule(config: ApplicationConfig): Module =
    module {
        single { config }
    }

fun Application.defaultModules(config: ApplicationConfig = environment.config): List<Module> =
    listOf(
        configurationModule(config),
        infrastructureModule(),
        applicationModule(),
    )

fun Application.configureApp(modules: List<Module>) {
    install(Koin) {
        slf4jLogger()
        modules(modules)
    }
    // Строгий разбор: у Ktor по умолчанию isLenient = true, он принял бы "30" как число.
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    configureErrorHandling()
    val getOwner by inject<GetOwnerHandler>()
    val listMeetingTypes by inject<ListMeetingTypesHandler>()
    val createMeetingType by inject<CreateMeetingTypeHandler>()
    val listSlots by inject<ListSlotsHandler>()
    val createBooking by inject<CreateBookingHandler>()
    val listUpcomingBookings by inject<ListUpcomingBookingsHandler>()
    routing {
        healthRoutes()
        catalogRoutes(getOwner, listMeetingTypes, createMeetingType)
        slotRoutes(listSlots)
        bookingRoutes(createBooking, listUpcomingBookings)
    }
}

fun Application.module() = configureApp(defaultModules())
